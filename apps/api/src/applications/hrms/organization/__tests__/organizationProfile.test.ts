import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { eq, inArray } from 'drizzle-orm';
import { createApp } from '../../../../app/server/createApp.js';
import { getDb } from '../../../../db/connection.js';
import {
  companies,
  memberships,
  roleAssignments,
  tenantModules,
  tenants,
  users,
} from '../../../../db/schema.js';
import { hashPassword } from '../../../../platform/auth/security.js';
import { signInForTest } from '../../../../platform/__tests__/support/testSession.js';
import { ValidationError } from '../../../../app/errors/AppError.js';
import { validateUpdateOrganizationProfile } from '../validation/organizationProfile.schema.js';

describe('Organization Profile Validation', () => {
  it('validates a valid complete organization profile payload', () => {
    const validPayload = {
      name: 'APJ3D Design Solution Pvt Ltd',
      displayName: 'APJ3D',
      organizationType: 'Private Limited',
      industry: 'IT Services',
      website: 'www.apj3d.com',
      logoUrl: 'https://example.com/logo.png',
      primaryEmail: 'hr@apj3d.com',
      phoneNumber: '+91 98765 43210',
      alternateEmail: 'admin@apj3d.com',
      alternatePhone: '+91 87654 32109',
      addressLine1: 'No. 123, Industrial Estate, SIPCOT Phase II',
      addressLine2: 'Hosur',
      country: 'India',
      state: 'Tamil Nadu',
      city: 'Hosur',
      postalCode: '635126',
    };

    const res = validateUpdateOrganizationProfile(validPayload);
    expect(res.name).toBe('APJ3D Design Solution Pvt Ltd');
    expect(res.displayName).toBe('APJ3D');
    expect(res.organizationType).toBe('Private Limited');
    expect(res.industry).toBe('IT Services');
    expect(res.website).toBe('www.apj3d.com');
    expect(res.primaryEmail).toBe('hr@apj3d.com');
    expect(res.postalCode).toBe('635126');
  });

  it('rejects missing required fields (name, organizationType, primaryEmail, addressLine1, country, state, city, postalCode)', () => {
    expect(() => validateUpdateOrganizationProfile({})).toThrow();
    try {
      validateUpdateOrganizationProfile({});
    } catch (err: unknown) {
      expect(err).toBeInstanceOf(ValidationError);
      const valErr = err as ValidationError;
      expect(valErr.details).toBeDefined();
      expect(valErr.details!.name).toBe('Organization name is required');
      expect(valErr.details!.organizationType).toBe('Organization type is required');
      expect(valErr.details!.primaryEmail).toBe('Primary email is required');
      expect(valErr.details!.addressLine1).toBe('Address line 1 is required');
      expect(valErr.details!.country).toBe('Country is required');
      expect(valErr.details!.state).toBe('State / Province is required');
      expect(valErr.details!.city).toBe('City is required');
      expect(valErr.details!.postalCode).toBe('Postal code is required');
    }
  });

  it('validates email formats for primary and alternate emails', () => {
    const invalidEmailPayload = {
      name: 'Test Corp',
      organizationType: 'Private Limited',
      primaryEmail: 'invalid-email',
      alternateEmail: 'not-an-email',
      addressLine1: '123 Main St',
      country: 'United States',
      state: 'California',
      city: 'San Francisco',
      postalCode: '94105',
    };

    expect(() => validateUpdateOrganizationProfile(invalidEmailPayload)).toThrow();
    try {
      validateUpdateOrganizationProfile(invalidEmailPayload);
    } catch (err: unknown) {
      expect(err).toBeInstanceOf(ValidationError);
      const valErr = err as ValidationError;
      expect(valErr.details!.primaryEmail).toBe('Invalid primary email format');
      expect(valErr.details!.alternateEmail).toBe('Invalid alternate email format');
    }
  });

  it('validates website URL format when supplied', () => {
    const invalidWebsitePayload = {
      name: 'Test Corp',
      organizationType: 'Private Limited',
      primaryEmail: 'info@test.com',
      website: 'not a url $$',
      addressLine1: '123 Main St',
      country: 'United States',
      state: 'California',
      city: 'San Francisco',
      postalCode: '94105',
    };

    expect(() => validateUpdateOrganizationProfile(invalidWebsitePayload)).toThrow();
    try {
      validateUpdateOrganizationProfile(invalidWebsitePayload);
    } catch (err: unknown) {
      expect(err).toBeInstanceOf(ValidationError);
      const valErr = err as ValidationError;
      expect(valErr.details!.website).toContain('valid website URL');
    }
  });

  it('validates postal code for India (requires 6 digits)', () => {
    const invalidPinPayload = {
      name: 'Test Corp',
      organizationType: 'Private Limited',
      primaryEmail: 'info@test.com',
      addressLine1: '123 Main St',
      country: 'India',
      state: 'Tamil Nadu',
      city: 'Hosur',
      postalCode: '63512', // 5 digits
    };

    expect(() => validateUpdateOrganizationProfile(invalidPinPayload)).toThrow();
    try {
      validateUpdateOrganizationProfile(invalidPinPayload);
    } catch (err: unknown) {
      expect(err).toBeInstanceOf(ValidationError);
      const valErr = err as ValidationError;
      expect(valErr.details!.postalCode).toBe('PIN code must be a 6-digit number');
    }
  });

  it('permits non-Indian postal codes that are not 6 digits', () => {
    const usPayload = {
      name: 'US Corp',
      organizationType: 'Corporation',
      primaryEmail: 'info@uscorp.com',
      addressLine1: '456 Market St',
      country: 'United States',
      state: 'California',
      city: 'San Francisco',
      postalCode: '94105-1234',
    };

    const res = validateUpdateOrganizationProfile(usPayload);
    expect(res.postalCode).toBe('94105-1234');
  });
});

describe('Organization Profile API (Multi-Company & RBAC)', () => {
  const app = createApp();
  const tenantId = 'tent_org_profile';
  const companyAId = 'comp_org_a';
  const companyBId = 'comp_org_b';

  let dbAvailable = false;
  let hrManagerToken: string;
  let unauthorizedToken: string;

  beforeAll(async () => {
    try {
      const db = getDb();
      // Test connectivity
      await db.select().from(tenants).limit(1);
      dbAvailable = true;
    } catch {
      dbAvailable = false;
      return;
    }

    const db = getDb();

    // 1. Provision Tenant
    await db
      .insert(tenants)
      .values({ id: tenantId, name: 'Org Profile Tenant', status: 'active' })
      .onDuplicateKeyUpdate({ set: { status: 'active' } });

    // 2. Provision Company A and Company B for Multi-Company isolation
    await db
      .insert(companies)
      .values([
        {
          id: companyAId,
          tenantId,
          name: 'APJ3D Design Solution Pvt Ltd',
          code: 'APJ3D',
          displayName: 'APJ3D',
          organizationType: 'Private Limited',
          industry: 'IT Services',
          website: 'www.apj3d.com',
          businessEmail: 'hr@apj3d.com',
          contactPhone: '+91 98765 43210',
          alternateEmail: 'admin@apj3d.com',
          alternatePhone: '+91 87654 32109',
          addressLine1: 'No. 123, Industrial Estate, SIPCOT Phase II',
          addressLine2: 'Hosur',
          country: 'India',
          state: 'Tamil Nadu',
          city: 'Hosur',
          postalCode: '635126',
          status: 'active',
        },
        {
          id: companyBId,
          tenantId,
          name: 'Company B Technologies',
          code: 'COMPB',
          displayName: 'CompB',
          organizationType: 'Public Limited',
          industry: 'Manufacturing',
          website: 'www.compb.com',
          businessEmail: 'contact@compb.com',
          contactPhone: '+91 12345 67890',
          addressLine1: '789 Industrial Zone',
          country: 'India',
          state: 'Karnataka',
          city: 'Bengaluru',
          postalCode: '560001',
          status: 'active',
        },
      ])
      .onDuplicateKeyUpdate({ set: { status: 'active' } });

    // Ensure HRMS entitlement
    await db
      .insert(tenantModules)
      .values({
        id: `tmod_${tenantId}_hrms`,
        tenantId,
        moduleCode: 'hrms',
        status: 'enabled',
      })
      .onDuplicateKeyUpdate({ set: { status: 'enabled' } });

    const passwordHash = hashPassword('Secret123!');

    // User 1: HR Manager with companyA membership & HR Manager role
    const hrUserId = 'usr_org_hrman';
    await db
      .insert(users)
      .values({
        id: hrUserId,
        email: 'hrmanager@orgprofile.example',
        firstName: 'HR',
        lastName: 'Manager',
        passwordHash: passwordHash.hash,
        salt: passwordHash.salt,
        status: 'active',
      })
      .onDuplicateKeyUpdate({ set: { status: 'active' } });

    await db
      .insert(memberships)
      .values({
        id: `mem_org_a_hr`,
        tenantId,
        companyId: companyAId,
        userId: hrUserId,
        role: 'employee',
        status: 'active',
      })
      .onDuplicateKeyUpdate({ set: { status: 'active' } });

    await db
      .insert(roleAssignments)
      .values({
        id: `ra_org_a_hr`,
        tenantId,
        companyId: companyAId,
        userId: hrUserId,
        roleId: 'role_sys_hr_manager',
      })
      .onDuplicateKeyUpdate({ set: { roleId: 'role_sys_hr_manager' } });

    // User 2: Employee without hrms admin rights
    const empUserId = 'usr_org_emp';
    await db
      .insert(users)
      .values({
        id: empUserId,
        email: 'employee@orgprofile.example',
        firstName: 'Regular',
        lastName: 'Employee',
        passwordHash: passwordHash.hash,
        salt: passwordHash.salt,
        status: 'active',
      })
      .onDuplicateKeyUpdate({ set: { status: 'active' } });

    await db
      .insert(memberships)
      .values({
        id: `mem_org_a_emp`,
        tenantId,
        companyId: companyAId,
        userId: empUserId,
        role: 'employee',
        status: 'active',
      })
      .onDuplicateKeyUpdate({ set: { status: 'active' } });

    await db
      .insert(roleAssignments)
      .values({
        id: `ra_org_a_emp`,
        tenantId,
        companyId: companyAId,
        userId: empUserId,
        roleId: 'role_sys_employee',
      })
      .onDuplicateKeyUpdate({ set: { roleId: 'role_sys_employee' } });

    const hrLogin = await signInForTest('hrmanager@orgprofile.example');
    hrManagerToken = hrLogin.token;

    const empLogin = await signInForTest('employee@orgprofile.example');
    unauthorizedToken = empLogin.token;
  });

  afterAll(async () => {
    if (!dbAvailable) return;
    const db = getDb();
    await db.delete(roleAssignments).where(inArray(roleAssignments.companyId, [companyAId, companyBId]));
    await db.delete(memberships).where(inArray(memberships.companyId, [companyAId, companyBId]));
    await db.delete(companies).where(inArray(companies.id, [companyAId, companyBId]));
    await db.delete(tenantModules).where(eq(tenantModules.tenantId, tenantId));
    await db.delete(users).where(inArray(users.id, ['usr_org_hrman', 'usr_org_emp']));
    await db.delete(tenants).where(eq(tenants.id, tenantId));
  });

  it('GET /hrms/organization/profile loads the active company organization profile', async () => {
    if (!dbAvailable) return;
    const res = await request(app)
      .get('/api/v1/hrms/organization/profile')
      .set('Authorization', `Bearer ${hrManagerToken}`)
      .set('x-company-id', companyAId);

    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.id).toBe(companyAId);
    expect(res.body.data.name).toBe('APJ3D Design Solution Pvt Ltd');
    expect(res.body.data.displayName).toBe('APJ3D');
    expect(res.body.data.organizationType).toBe('Private Limited');
    expect(res.body.data.primaryEmail).toBe('hr@apj3d.com');
    expect(res.body.data.city).toBe('Hosur');
    expect(res.body.data.state).toBe('Tamil Nadu');
    expect(res.body.data.country).toBe('India');
    expect(res.body.data.postalCode).toBe('635126');
  });

  it('PUT /hrms/organization/profile updates and persists the profile', async () => {
    if (!dbAvailable) return;
    const updatePayload = {
      name: 'APJ3D Design Solution Private Limited',
      displayName: 'APJ3D Global',
      organizationType: 'Private Limited',
      industry: 'IT Services',
      website: 'www.apj3d-global.com',
      primaryEmail: 'contact@apj3d-global.com',
      phoneNumber: '+91 98765 43210',
      alternateEmail: 'support@apj3d-global.com',
      alternatePhone: '+91 87654 32109',
      addressLine1: 'No. 124, Industrial Estate Phase II',
      addressLine2: 'Hosur District',
      country: 'India',
      state: 'Tamil Nadu',
      city: 'Hosur',
      postalCode: '635126',
    };

    const putRes = await request(app)
      .put('/api/v1/hrms/organization/profile')
      .set('Authorization', `Bearer ${hrManagerToken}`)
      .set('x-company-id', companyAId)
      .send(updatePayload);

    expect(putRes.status).toBe(200);
    expect(putRes.body.data.name).toBe('APJ3D Design Solution Private Limited');
    expect(putRes.body.data.displayName).toBe('APJ3D Global');
    expect(putRes.body.data.website).toBe('www.apj3d-global.com');
    expect(putRes.body.data.primaryEmail).toBe('contact@apj3d-global.com');

    // Reload to verify persistence
    const getRes = await request(app)
      .get('/api/v1/hrms/organization/profile')
      .set('Authorization', `Bearer ${hrManagerToken}`)
      .set('x-company-id', companyAId);

    expect(getRes.status).toBe(200);
    expect(getRes.body.data.name).toBe('APJ3D Design Solution Private Limited');
    expect(getRes.body.data.displayName).toBe('APJ3D Global');
  });

  it('enforces multi-company isolation: Company A cannot access Company B profile', async () => {
    if (!dbAvailable) return;
    // User only has membership in Company A, attempting to claim Company B header is forbidden
    const res = await request(app)
      .get('/api/v1/hrms/organization/profile')
      .set('Authorization', `Bearer ${hrManagerToken}`)
      .set('x-company-id', companyBId);

    expect(res.status).toBe(403);
  });

  it('rejects access from unauthorized employee lacking organization permissions', async () => {
    if (!dbAvailable) return;
    const res = await request(app)
      .get('/api/v1/hrms/organization/profile')
      .set('Authorization', `Bearer ${unauthorizedToken}`)
      .set('x-company-id', companyAId);

    expect(res.status).toBe(403);
  });
});
