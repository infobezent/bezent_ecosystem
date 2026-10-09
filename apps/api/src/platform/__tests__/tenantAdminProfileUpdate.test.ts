import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { eq, or } from 'drizzle-orm';
import { createApp } from '../../app/server/createApp.js';
import { isDatabaseConfigured, getDb } from '../../db/connection.js';
import {
  tenants,
  tenantDetails,
  companies,
  users,
  memberships,
  tenantAdmins,
  auditLogs,
} from '../../db/schema.js';
import { hashPassword } from '../auth/security.js';
import { signInForTest } from './support/testSession.js';

describe('Tenant Admin Profile Update Canonical Contract (PATCH /api/v1/tenant-admin/tenant)', () => {
  const app = createApp();

  const tenantAId = 'tent_ta_prof_a';
  const tenantBId = 'tent_ta_prof_b';
  const companyA1Id = 'comp_ta_prof_a1';

  const tenantAdminAId = 'usr_ta_prof_admin_a';
  const tenantAdminAEmail = 'ta_prof_admin_a@tenant-a.example';

  const companyAdminA1Id = 'usr_ta_prof_ca_a1';
  const companyAdminA1Email = 'ca_prof_a1@tenant-a.example';

  const standardUserAId = 'usr_ta_prof_std_a';
  const standardUserAEmail = 'std_prof_a@tenant-a.example';

  let tenantAdminAToken: string;
  let companyAdminA1Token: string;
  let standardUserAToken: string;

  beforeAll(async () => {
    if (!isDatabaseConfigured) return;
    const db = getDb();

    // 1. Tenants
    await db
      .insert(tenants)
      .values([
        { id: tenantAId, name: 'Original Tenant A Name', status: 'active', maxCompanies: 5 },
        { id: tenantBId, name: 'Untouched Tenant B Name', status: 'active', maxCompanies: 10 },
      ])
      .onDuplicateKeyUpdate({ set: { status: 'active' } });

    // 2. Tenant Details
    await db.delete(tenantDetails).where(or(eq(tenantDetails.tenantId, tenantAId), eq(tenantDetails.tenantId, tenantBId)));
    await db
      .insert(tenantDetails)
      .values([
        {
          tenantId: tenantAId,
          code: 'TEN-A-CODE',
          contactEmail: 'old_contact@tenant-a.example',
          contactPhone: '+1 555-0100',
        },
        {
          tenantId: tenantBId,
          code: 'TEN-B-CODE',
          contactEmail: 'contact@tenant-b.example',
          contactPhone: '+1 555-0200',
        },
      ]);

    // 3. Company
    await db
      .insert(companies)
      .values([
        {
          id: companyA1Id,
          tenantId: tenantAId,
          name: 'Company A1',
          code: 'COMPA1',
          status: 'active',
        },
      ])
      .onDuplicateKeyUpdate({ set: { status: 'active' } });

    // 4. Users
    const pwd = hashPassword('TestPassword2026!');

    await db
      .insert(users)
      .values([
        {
          id: tenantAdminAId,
          email: tenantAdminAEmail,
          passwordHash: pwd.hash,
          salt: pwd.salt,
          firstName: 'Teresa',
          lastName: 'Admin',
          status: 'active',
          isSuperAdmin: false,
        },
        {
          id: companyAdminA1Id,
          email: companyAdminA1Email,
          passwordHash: pwd.hash,
          salt: pwd.salt,
          firstName: 'Charlie',
          lastName: 'CompanyAdmin',
          status: 'active',
          isSuperAdmin: false,
        },
        {
          id: standardUserAId,
          email: standardUserAEmail,
          passwordHash: pwd.hash,
          salt: pwd.salt,
          firstName: 'Stanley',
          lastName: 'Standard',
          status: 'active',
          isSuperAdmin: false,
        },
      ])
      .onDuplicateKeyUpdate({ set: { status: 'active', isSuperAdmin: false } });

    // 5. Tenant Admin Assignment
    await db.delete(tenantAdmins).where(eq(tenantAdmins.tenantId, tenantAId));
    await db.insert(tenantAdmins).values({
      id: 'ta_record_prof_a',
      tenantId: tenantAId,
      userId: tenantAdminAId,
      status: 'active',
    });

    // 6. Memberships for non-tenant admins
    await db
      .insert(memberships)
      .values([
        {
          id: 'mem_ta_prof_ca_a1',
          userId: companyAdminA1Id,
          tenantId: tenantAId,
          companyId: companyA1Id,
          role: 'company_admin',
          status: 'active',
        },
        {
          id: 'mem_ta_prof_std_a',
          userId: standardUserAId,
          tenantId: tenantAId,
          companyId: companyA1Id,
          role: 'employee',
          status: 'active',
        },
      ])
      .onDuplicateKeyUpdate({ set: { status: 'active' } });

    // 7. Login tokens
    tenantAdminAToken = (await signInForTest(tenantAdminAEmail)).token;
    companyAdminA1Token = (await signInForTest(companyAdminA1Email)).token;
    standardUserAToken = (await signInForTest(standardUserAEmail)).token;
  });

  it('1. Tenant Admin successfully updates own tenant profile and receives 200', async () => {
    if (!isDatabaseConfigured) return;

    const res = await request(app)
      .patch('/api/v1/tenant-admin/tenant')
      .set('Authorization', `Bearer ${tenantAdminAToken}`)
      .send({
        name: 'Acme Technologies Corporation',
        contactEmail: 'contact@acme-updated.example',
        contactPhone: '+1 800-555-0199',
      });

    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.id).toBe(tenantAId);
    expect(res.body.data.name).toBe('Acme Technologies Corporation');
    expect(res.body.data.contactEmail).toBe('contact@acme-updated.example');
    expect(res.body.data.contactPhone).toBe('+1 800-555-0199');
    expect(res.body.data.code).toBe('TEN-A-CODE');

    // Verify DB persistence
    const db = getDb();
    const [tRow] = await db.select().from(tenants).where(eq(tenants.id, tenantAId));
    expect(tRow?.name).toBe('Acme Technologies Corporation');

    const [dRow] = await db.select().from(tenantDetails).where(eq(tenantDetails.tenantId, tenantAId));
    expect(dRow?.contactEmail).toBe('contact@acme-updated.example');
    expect(dRow?.contactPhone).toBe('+1 800-555-0199');
  });

  it('2. Prevents spoofing: body tenantId cannot cross tenant boundary', async () => {
    if (!isDatabaseConfigured) return;

    // Caller is Tenant Admin for Tenant A, but passes tenantId for Tenant B in body
    const res = await request(app)
      .patch('/api/v1/tenant-admin/tenant')
      .set('Authorization', `Bearer ${tenantAdminAToken}`)
      .send({
        tenantId: tenantBId,
        id: tenantBId,
        name: 'Should Not Affect Tenant B',
      });

    expect(res.status).toBe(200);
    // Response must be for caller's Tenant A
    expect(res.body.data.id).toBe(tenantAId);
    expect(res.body.data.name).toBe('Should Not Affect Tenant B');

    // Verify Tenant B in database was NOT modified
    const db = getDb();
    const [tbRow] = await db.select().from(tenants).where(eq(tenants.id, tenantBId));
    expect(tbRow?.name).toBe('Untouched Tenant B Name');
  });

  it('3. Rejects Standard User with 403 Forbidden', async () => {
    if (!isDatabaseConfigured) return;

    const res = await request(app)
      .patch('/api/v1/tenant-admin/tenant')
      .set('Authorization', `Bearer ${standardUserAToken}`)
      .send({ name: 'Hacked Tenant Name' });

    expect(res.status).toBe(403);
    expect(res.body.error?.code).toBe('TENANT_ADMIN_AUTHORITY_REQUIRED');
  });

  it('4. Rejects Company Admin alone with 403 Forbidden', async () => {
    if (!isDatabaseConfigured) return;

    const res = await request(app)
      .patch('/api/v1/tenant-admin/tenant')
      .set('Authorization', `Bearer ${companyAdminA1Token}`)
      .send({ name: 'Company Admin Override' });

    expect(res.status).toBe(403);
    expect(res.body.error?.code).toBe('TENANT_ADMIN_AUTHORITY_REQUIRED');
  });

  it('5. Governed fields (code, status, maxCompanies) cannot be changed via PATCH', async () => {
    if (!isDatabaseConfigured) return;

    const res = await request(app)
      .patch('/api/v1/tenant-admin/tenant')
      .set('Authorization', `Bearer ${tenantAdminAToken}`)
      .send({
        name: 'Valid Name Update',
        code: 'HACKED-CODE',
        status: 'suspended',
        maxCompanies: 9999,
      });

    expect(res.status).toBe(200);

    const db = getDb();
    const [tRow] = await db.select().from(tenants).where(eq(tenants.id, tenantAId));
    expect(tRow?.status).toBe('active');
    expect(tRow?.maxCompanies).toBe(5);

    const [dRow] = await db.select().from(tenantDetails).where(eq(tenantDetails.tenantId, tenantAId));
    expect(dRow?.code).toBe('TEN-A-CODE');
  });

  it('6. Rejects invalid field values with 400 Validation Error', async () => {
    if (!isDatabaseConfigured) return;

    // Empty name
    const resEmptyName = await request(app)
      .patch('/api/v1/tenant-admin/tenant')
      .set('Authorization', `Bearer ${tenantAdminAToken}`)
      .send({ name: '   ' });

    expect(resEmptyName.status).toBe(400);

    // Invalid email
    const resInvalidEmail = await request(app)
      .patch('/api/v1/tenant-admin/tenant')
      .set('Authorization', `Bearer ${tenantAdminAToken}`)
      .send({ contactEmail: 'not-an-email' });

    expect(resInvalidEmail.status).toBe(400);

    // Overly long phone number
    const resLongPhone = await request(app)
      .patch('/api/v1/tenant-admin/tenant')
      .set('Authorization', `Bearer ${tenantAdminAToken}`)
      .send({ contactPhone: '9'.repeat(60) });

    expect(resLongPhone.status).toBe(400);
  });

  it('7. Emits tenant_profile_updated audit event', async () => {
    if (!isDatabaseConfigured) return;

    await request(app)
      .patch('/api/v1/tenant-admin/tenant')
      .set('Authorization', `Bearer ${tenantAdminAToken}`)
      .send({
        name: 'Audited Tenant Name',
        contactEmail: 'audited@example.com',
      });

    const db = getDb();
    const logs = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.tenantId, tenantAId));

    const profileUpdateEvents = logs.filter((l) => l.action === 'tenant_profile_updated');
    expect(profileUpdateEvents.length).toBeGreaterThan(0);

    const latest = profileUpdateEvents[profileUpdateEvents.length - 1];
    expect(latest?.actorUserId).toBe(tenantAdminAId);
    expect(latest?.targetType).toBe('tenant');
    expect(latest?.targetId).toBe(tenantAId);
  });
});
