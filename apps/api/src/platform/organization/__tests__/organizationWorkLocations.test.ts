import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { inArray, eq } from 'drizzle-orm';
import { createApp } from '../../../app/server/createApp.js';
import { getDb } from '../../../db/connection.js';
import {
  tenants,
  companies,
  users,
  memberships,
  roleAssignments,
  tenantModules,
  locations,
  employees,
} from '../../../db/schema.js';
import { signInForTest } from '../../__tests__/support/testSession.js';
import { hashPassword } from '../../auth/security.js';
import { ValidationError } from '../../../app/errors/AppError.js';
import {
  validateCreateWorkLocation,
  validateUpdateWorkLocation,
  isValidIanaTimezone,
} from '../validation/workLocation.schema.js';

describe('BEZENT HRMS — Organization Work Locations Integration & Domain Tests', () => {
  const testTenantA = 'tenant_loc_test_a';
  const testTenantB = 'tenant_loc_test_b';
  const testCompanyA = 'comp_loc_test_a';
  const testCompanyB = 'comp_loc_test_b';
  const testUserA = 'user_loc_test_a';
  const testUserB = 'user_loc_test_b';
  const testUserNoPerm = 'user_loc_test_noperm';
  const testEmpA = 'emp_loc_test_a';

  let app: ReturnType<typeof createApp>;
  let tokenA: string;
  let tokenB: string;
  let tokenNoPerm: string;

  beforeAll(async () => {
    app = createApp();
    const db = getDb();

    // Clean up any stale test records
    await db.delete(employees).where(inArray(employees.companyId, [testCompanyA, testCompanyB]));
    await db.delete(locations).where(inArray(locations.companyId, [testCompanyA, testCompanyB]));
    await db.delete(roleAssignments).where(inArray(roleAssignments.companyId, [testCompanyA, testCompanyB]));
    await db.delete(memberships).where(inArray(memberships.companyId, [testCompanyA, testCompanyB]));
    await db.delete(companies).where(inArray(companies.id, [testCompanyA, testCompanyB]));
    await db.delete(tenantModules).where(inArray(tenantModules.tenantId, [testTenantA, testTenantB]));
    await db.delete(users).where(inArray(users.id, [testUserA, testUserB, testUserNoPerm]));
    await db.delete(tenants).where(inArray(tenants.id, [testTenantA, testTenantB]));

    // Seed tenants
    await db.insert(tenants).values([
      { id: testTenantA, name: 'Tenant Loc A', status: 'active' },
      { id: testTenantB, name: 'Tenant Loc B', status: 'active' },
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
        code: 'ALPHA_LOC',
        displayName: 'Alpha',
        status: 'active',
      },
      {
        id: testCompanyB,
        tenantId: testTenantB,
        name: 'Beta Corp',
        code: 'BETA_LOC',
        displayName: 'Beta',
        status: 'active',
      },
    ]);

    // Seed users
    const pwd = hashPassword('password123');

    await db.insert(users).values([
      {
        id: testUserA,
        email: 'loc_admin_a@alpha.test',
        passwordHash: pwd.hash,
        salt: pwd.salt,
        firstName: 'Alice',
        lastName: 'Admin',
        status: 'active',
      },
      {
        id: testUserB,
        email: 'loc_admin_b@beta.test',
        passwordHash: pwd.hash,
        salt: pwd.salt,
        firstName: 'Bob',
        lastName: 'Admin',
        status: 'active',
      },
      {
        id: testUserNoPerm,
        email: 'loc_noperm@alpha.test',
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
        id: 'mem_loc_test_a',
        tenantId: testTenantA,
        companyId: testCompanyA,
        userId: testUserA,
        role: 'hr_manager',
        status: 'active',
      },
      {
        id: 'mem_loc_test_b',
        tenantId: testTenantB,
        companyId: testCompanyB,
        userId: testUserB,
        role: 'hr_manager',
        status: 'active',
      },
      {
        id: 'mem_loc_test_noperm',
        tenantId: testTenantA,
        companyId: testCompanyA,
        userId: testUserNoPerm,
        role: 'employee',
        status: 'active',
      },
    ]);

    // Seed role assignments (HR Manager role for A and B)
    await db.insert(roleAssignments).values([
      {
        id: 'ra_loc_test_a',
        tenantId: testTenantA,
        companyId: testCompanyA,
        userId: testUserA,
        roleId: 'role_sys_hr_manager',
      },
      {
        id: 'ra_loc_test_b',
        tenantId: testTenantB,
        companyId: testCompanyB,
        userId: testUserB,
        roleId: 'role_sys_hr_manager',
      },
    ]);

    // Obtain tokens
    const sessionA = await signInForTest('loc_admin_a@alpha.test');
    tokenA = sessionA.token;

    const sessionB = await signInForTest('loc_admin_b@beta.test');
    tokenB = sessionB.token;

    const sessionNoPerm = await signInForTest('loc_noperm@alpha.test');
    tokenNoPerm = sessionNoPerm.token;
  });

  afterAll(async () => {
    const db = getDb();
    await db.delete(employees).where(inArray(employees.companyId, [testCompanyA, testCompanyB]));
    await db.delete(locations).where(inArray(locations.companyId, [testCompanyA, testCompanyB]));
    await db.delete(roleAssignments).where(inArray(roleAssignments.companyId, [testCompanyA, testCompanyB]));
    await db.delete(memberships).where(inArray(memberships.companyId, [testCompanyA, testCompanyB]));
    await db.delete(companies).where(inArray(companies.id, [testCompanyA, testCompanyB]));
    await db.delete(tenantModules).where(inArray(tenantModules.tenantId, [testTenantA, testTenantB]));
    await db.delete(users).where(inArray(users.id, [testUserA, testUserB, testUserNoPerm]));
    await db.delete(tenants).where(inArray(tenants.id, [testTenantA, testTenantB]));
  });

  let officeLocId: string;
  let branchLocId: string;
  let remoteLocId: string;

  describe('Work Location V1 CRUD, Address & Lifecycle Rules', () => {
    // 1. Create Office with physical address
    it('1. creates an Office work location with valid physical address', async () => {
      const res = await request(app)
        .post('/api/v1/hrms/organization/work-locations')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-company-id', testCompanyA)
        .send({
          name: 'Hosur Office',
          code: 'HSR',
          type: 'office',
          addressLine1: 'Plot 42, SIPCOT Industrial Complex',
          addressLine2: 'Phase II',
          city: 'Hosur',
          state: 'Tamil Nadu',
          country: 'India',
          postalCode: '635126',
          timezone: 'Asia/Kolkata',
          description: 'Main manufacturing and administrative office',
        });

      expect(res.status).toBe(201);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.name).toBe('Hosur Office');
      expect(res.body.data.code).toBe('HSR');
      expect(res.body.data.type).toBe('office');
      expect(res.body.data.city).toBe('Hosur');
      expect(res.body.data.state).toBe('Tamil Nadu');
      expect(res.body.data.country).toBe('India');
      expect(res.body.data.postalCode).toBe('635126');
      expect(res.body.data.timezone).toBe('Asia/Kolkata');
      expect(res.body.data.status).toBe('active');

      officeLocId = res.body.data.id;
    });

    // 2. Create Branch
    it('2. creates a Branch work location with physical address', async () => {
      const res = await request(app)
        .post('/api/v1/hrms/organization/work-locations')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-company-id', testCompanyA)
        .send({
          name: 'Chennai Branch',
          code: 'CHN-BR',
          type: 'branch',
          addressLine1: '123 Mount Road',
          city: 'Chennai',
          state: 'Tamil Nadu',
          country: 'India',
          postalCode: '600002',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.type).toBe('branch');
      expect(res.body.data.name).toBe('Chennai Branch');
      branchLocId = res.body.data.id;
    });

    // 3. Create Plant / Factory
    it('3. creates a Plant / Factory work location', async () => {
      const res = await request(app)
        .post('/api/v1/hrms/organization/work-locations')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-company-id', testCompanyA)
        .send({
          name: 'Manufacturing Unit 1',
          code: 'MFG-01',
          type: 'plant_factory',
          addressLine1: 'Survey No. 88, Industrial Corridor',
          city: 'Coimbatore',
          state: 'Tamil Nadu',
          country: 'India',
          postalCode: '641001',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.type).toBe('plant_factory');
    });

    // 4. Create Client Site
    it('4. creates a Client Site work location', async () => {
      const res = await request(app)
        .post('/api/v1/hrms/organization/work-locations')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-company-id', testCompanyA)
        .send({
          name: 'Client Alpha HQ Site',
          code: 'CLT-ALP',
          type: 'client_site',
          addressLine1: 'Client Tech Park, Tower B',
          city: 'Bengaluru',
          state: 'Karnataka',
          country: 'India',
          postalCode: '560100',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.type).toBe('client_site');
    });

    // 5. Create Remote without address
    it('5. creates a Remote work location without address fields', async () => {
      const res = await request(app)
        .post('/api/v1/hrms/organization/work-locations')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-company-id', testCompanyA)
        .send({
          name: 'India Remote',
          code: 'REM-IN',
          type: 'remote',
          timezone: 'Asia/Kolkata',
          description: 'All work-from-home employees across India',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('India Remote');
      expect(res.body.data.type).toBe('remote');
      expect(res.body.data.addressLine1).toBeNull();
      expect(res.body.data.city).toBeNull();
      expect(res.body.data.country).toBeNull();
      expect(res.body.data.timezone).toBe('Asia/Kolkata');

      remoteLocId = res.body.data.id;
    });

    // 6. Create Remote with optional address
    it('6. creates a Remote work location with optional reference address', async () => {
      const res = await request(app)
        .post('/api/v1/hrms/organization/work-locations')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-company-id', testCompanyA)
        .send({
          name: 'Global Remote (APAC)',
          code: 'REM-APAC',
          type: 'remote',
          addressLine1: 'c/o WeWork Marina Bay',
          city: 'Singapore',
          country: 'Singapore',
          timezone: 'Asia/Singapore',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.type).toBe('remote');
      expect(res.body.data.addressLine1).toBe('c/o WeWork Marina Bay');
      expect(res.body.data.city).toBe('Singapore');
      expect(res.body.data.country).toBe('Singapore');
    });

    // 7. Reject physical location missing required address
    it('7. rejects physical location when required address fields are missing', async () => {
      const res = await request(app)
        .post('/api/v1/hrms/organization/work-locations')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-company-id', testCompanyA)
        .send({
          name: 'Incomplete Office',
          type: 'office',
          // Missing addressLine1, city, state, country, postalCode
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.details?.addressLine1).toBeDefined();
      expect(res.body.error.details?.city).toBeDefined();
      expect(res.body.error.details?.country).toBeDefined();
      expect(res.body.error.details?.postalCode).toBeDefined();
    });

    // 8. India postal-code validation where applicable
    it('8. enforces 6-digit PIN validation when country is India', async () => {
      const res = await request(app)
        .post('/api/v1/hrms/organization/work-locations')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-company-id', testCompanyA)
        .send({
          name: 'Invalid PIN Office',
          type: 'office',
          addressLine1: 'Test Road',
          city: 'Chennai',
          state: 'Tamil Nadu',
          country: 'India',
          postalCode: 'ABC-12', // Invalid Indian PIN
        });

      expect(res.status).toBe(400);
      expect(res.body.error.details?.postalCode).toContain('PIN code must be a 6-digit number');
    });

    // 9. Non-India postal validation does not incorrectly apply Indian rule
    it('9. allows alphanumeric postal codes for non-India countries', async () => {
      const res = await request(app)
        .post('/api/v1/hrms/organization/work-locations')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-company-id', testCompanyA)
        .send({
          name: 'London Sales Hub',
          code: 'LON-HUB',
          type: 'branch',
          addressLine1: '10 Downing Street',
          city: 'London',
          state: 'Greater London',
          country: 'United Kingdom',
          postalCode: 'SW1A 2AA', // UK alphanumeric postal code
          timezone: 'Europe/London',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.postalCode).toBe('SW1A 2AA');
      expect(res.body.data.country).toBe('United Kingdom');
    });

    // 10. Valid IANA timezone
    it('10. accepts valid IANA timezone identifiers', () => {
      expect(isValidIanaTimezone('Asia/Kolkata')).toBe(true);
      expect(isValidIanaTimezone('America/New_York')).toBe(true);
      expect(isValidIanaTimezone('Europe/London')).toBe(true);
      expect(isValidIanaTimezone('UTC')).toBe(true);
    });

    // 11. Invalid timezone rejection
    it('11. rejects invalid non-IANA timezone strings', async () => {
      const res = await request(app)
        .post('/api/v1/hrms/organization/work-locations')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-company-id', testCompanyA)
        .send({
          name: 'Invalid TZ Office',
          type: 'office',
          addressLine1: '123 Test St',
          city: 'Hosur',
          state: 'Tamil Nadu',
          country: 'India',
          postalCode: '635126',
          timezone: 'IST', // Display abbreviation, not canonical IANA
        });

      expect(res.status).toBe(400);
      expect(res.body.error.details?.timezone).toContain('Invalid IANA timezone identifier');
    });

    // 12. Create without optional code
    it('12. creates work location without optional code (code is null)', async () => {
      const res = await request(app)
        .post('/api/v1/hrms/organization/work-locations')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-company-id', testCompanyA)
        .send({
          name: 'Uncoded Regional Hub',
          type: 'office',
          addressLine1: 'Hub Street 1',
          city: 'Salem',
          state: 'Tamil Nadu',
          country: 'India',
          postalCode: '636001',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.code).toBeNull();
    });

    // 13. Duplicate code rejection in same company
    it('13. rejects duplicate location code in same company with 409 Conflict', async () => {
      const res = await request(app)
        .post('/api/v1/hrms/organization/work-locations')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-company-id', testCompanyA)
        .send({
          name: 'Another Hosur Office',
          code: 'HSR', // Already used in test 1
          type: 'office',
          addressLine1: 'Plot 99, SIPCOT',
          city: 'Hosur',
          state: 'Tamil Nadu',
          country: 'India',
          postalCode: '635126',
        });

      expect(res.status).toBe(409);
      expect(res.body.error?.message).toContain('already in use in this company');
    });

    // 14. Same code allowed in different companies
    it('14. allows the same location code in different companies', async () => {
      const res = await request(app)
        .post('/api/v1/hrms/organization/work-locations')
        .set('Authorization', `Bearer ${tokenB}`)
        .set('x-company-id', testCompanyB)
        .send({
          name: 'Beta Hosur Facility',
          code: 'HSR', // Same code as Alpha, but in Beta Corp
          type: 'office',
          addressLine1: 'Beta Tech Zone',
          city: 'Hosur',
          state: 'Tamil Nadu',
          country: 'India',
          postalCode: '635126',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.code).toBe('HSR');
      expect(res.body.data.companyId).toBe(testCompanyB);
    });

    // 15. Update metadata
    it('15. updates work location metadata successfully', async () => {
      const res = await request(app)
        .put(`/api/v1/hrms/organization/work-locations/${officeLocId}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-company-id', testCompanyA)
        .send({
          name: 'Hosur Headquarters & Plant',
          description: 'Updated comprehensive facility description',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Hosur Headquarters & Plant');
      expect(res.body.data.description).toBe('Updated comprehensive facility description');
      expect(res.body.data.id).toBe(officeLocId); // ID remains stable
    });

    // 16. Update address without Employee mutation
    it('16. updates address fields without altering employee records', async () => {
      const db = getDb();

      // Seed an employee assigned to officeLocId
      await db.insert(employees).values({
        id: testEmpA,
        tenantId: testTenantA,
        companyId: testCompanyA,
        employeeNumber: 'EMP-LOC-001',
        firstName: 'Dev',
        lastName: 'Worker',
        email: 'dev_worker@alpha.test',
        locationId: officeLocId,
        joiningDate: '2026-01-01',
        employmentType: 'full_time',
        employmentStatus: 'active',
      });

      const res = await request(app)
        .put(`/api/v1/hrms/organization/work-locations/${officeLocId}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-company-id', testCompanyA)
        .send({
          addressLine1: 'Plot 42-B, Extended SIPCOT Complex',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.addressLine1).toBe('Plot 42-B, Extended SIPCOT Complex');

      // Verify employee record still points to officeLocId and was not mutated
      const [emp] = await db.select().from(employees).where(eq(employees.id, testEmpA));
      expect(emp).toBeDefined();
      expect(emp!.locationId).toBe(officeLocId);
      expect(emp!.employmentStatus).toBe('active');
    });

    // 17. Deactivate
    it('17. deactivates a work location and returns active employee impact', async () => {
      const res = await request(app)
        .post(`/api/v1/hrms/organization/work-locations/${officeLocId}/deactivate`)
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-company-id', testCompanyA);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('inactive');
      expect(res.body.affectedEmployeeCount).toBe(1);
    });

    // 18. Deactivate with Employee references preserves Employee records
    it('18. deactivation preserves employee references and historical assignments', async () => {
      const db = getDb();
      const [emp] = await db.select().from(employees).where(eq(employees.id, testEmpA));
      expect(emp).toBeDefined();
      expect(emp!.locationId).toBe(officeLocId);
      expect(emp!.employmentStatus).toBe('active');
    });

    // 19. Inactive Work Location excluded from active/new-assignment lookup
    it('19. excludes inactive work locations when status=active filter is used', async () => {
      const res = await request(app)
        .get('/api/v1/hrms/organization/work-locations?status=active')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-company-id', testCompanyA);

      expect(res.status).toBe(200);
      const items = res.body.data as Array<{ id: string; status: string }>;
      expect(items.some((i) => i.id === officeLocId)).toBe(false);
      expect(items.every((i) => i.status === 'active')).toBe(true);
    });

    // 20. Reactivate
    it('20. reactivates a deactivated work location', async () => {
      const res = await request(app)
        .post(`/api/v1/hrms/organization/work-locations/${officeLocId}/reactivate`)
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-company-id', testCompanyA);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('active');

      // Now it appears in active lookup again
      const activeRes = await request(app)
        .get('/api/v1/hrms/organization/work-locations?status=active')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-company-id', testCompanyA);

      const items = activeRes.body.data as Array<{ id: string }>;
      expect(items.some((i) => i.id === officeLocId)).toBe(true);
    });

    // 21. List / Search / Status / Type filters
    it('21. supports search, status, and locationType query filters', async () => {
      // Type filter for remote
      const remoteRes = await request(app)
        .get('/api/v1/hrms/organization/work-locations?locationType=remote')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-company-id', testCompanyA);

      expect(remoteRes.status).toBe(200);
      expect(remoteRes.body.data.every((i: { type: string }) => i.type === 'remote')).toBe(true);

      // Search filter for Chennai
      const searchRes = await request(app)
        .get('/api/v1/hrms/organization/work-locations?search=Chennai')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-company-id', testCompanyA);

      expect(searchRes.status).toBe(200);
      expect(searchRes.body.data.some((i: { id: string }) => i.id === branchLocId)).toBe(true);
    });

    // 22. Cross-company get rejection
    it('22. prevents Company A from retrieving Company B work location', async () => {
      // Company B creates a location
      const bRes = await request(app)
        .post('/api/v1/hrms/organization/work-locations')
        .set('Authorization', `Bearer ${tokenB}`)
        .set('x-company-id', testCompanyB)
        .send({
          name: 'Beta Secret Site',
          code: 'B-SEC',
          type: 'office',
          addressLine1: '123 Private Blvd',
          city: 'Hyderabad',
          state: 'Telangana',
          country: 'India',
          postalCode: '500001',
        });

      const bLocId = bRes.body.data.id;

      // Company A attempts to get Company B location
      const crossRes = await request(app)
        .get(`/api/v1/hrms/organization/work-locations/${bLocId}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-company-id', testCompanyA);

      expect(crossRes.status).toBe(404);
    });

    // 23. Cross-company update rejection
    it('23. prevents Company A from updating Company B work location', async () => {
      // Find Beta's location
      const bList = await request(app)
        .get('/api/v1/hrms/organization/work-locations')
        .set('Authorization', `Bearer ${tokenB}`)
        .set('x-company-id', testCompanyB);

      const bLocId = bList.body.data[0].id;

      const res = await request(app)
        .put(`/api/v1/hrms/organization/work-locations/${bLocId}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-company-id', testCompanyA)
        .send({ name: 'Malicious Rename' });

      expect(res.status).toBe(404);
    });

    // 24. Cross-company lifecycle rejection
    it('24. prevents Company A from deactivating Company B work location', async () => {
      const bList = await request(app)
        .get('/api/v1/hrms/organization/work-locations')
        .set('Authorization', `Bearer ${tokenB}`)
        .set('x-company-id', testCompanyB);

      const bLocId = bList.body.data[0].id;

      const res = await request(app)
        .post(`/api/v1/hrms/organization/work-locations/${bLocId}/deactivate`)
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-company-id', testCompanyA);

      expect(res.status).toBe(404);
    });

    // 25. RBAC read permission
    it('25. allows users with organization.workLocations.view to list and view locations', async () => {
      const res = await request(app)
        .get('/api/v1/hrms/organization/work-locations')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-company-id', testCompanyA);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    // 26. RBAC manage permission
    it('26. rejects modification requests for users without manage permission', async () => {
      const res = await request(app)
        .post('/api/v1/hrms/organization/work-locations')
        .set('Authorization', `Bearer ${tokenNoPerm}`)
        .set('x-company-id', testCompanyA)
        .send({
          name: 'Unauthorized Office',
          type: 'office',
          addressLine1: 'No Street',
          city: 'Chennai',
          state: 'Tamil Nadu',
          country: 'India',
          postalCode: '600001',
        });

      expect(res.status).toBe(403);
    });

    // 27. Persistence after reload
    it('27. persists work location attributes across fresh database queries', async () => {
      const db = getDb();
      const [persisted] = await db
        .select()
        .from(locations)
        .where(eq(locations.id, officeLocId));

      expect(persisted).toBeDefined();
      expect(persisted!.name).toBe('Hosur Headquarters & Plant');
      expect(persisted!.code).toBe('HSR');
      expect(persisted!.type).toBe('office');
      expect(persisted!.city).toBe('Hosur');
      expect(persisted!.postalCode).toBe('635126');
      expect(persisted!.timezone).toBe('Asia/Kolkata');
    });

    // Backward compatibility alias tests
    it('verifies /locations alias works identically to /work-locations', async () => {
      const res = await request(app)
        .get('/api/v1/hrms/organization/locations')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-company-id', testCompanyA);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });
});
