import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { sql } from 'drizzle-orm';
import { createApp } from '../../app/server/createApp.js';
import { isDatabaseConfigured, getDb } from '../../db/connection.js';
import {
  tenants,
  companies,
  users,
  memberships,
  roleAssignments,
  tenantAdmins,
  invitations,
  auditLogs,
} from '../../db/schema.js';
import { hashPassword } from '../auth/security.js';
import { signInForTest } from './support/testSession.js';

describe('Company Access V1: Users, Invitations, Roles & Safety Rules', () => {
  const app = createApp();

  const tenantMainId = 'tent_cov1_main';
  const tenantOtherId = 'tent_cov1_other';

  const companyAId = 'comp_cov1_alpha';
  const companyBId = 'comp_cov1_beta';
  const companyOtherId = 'comp_cov1_other';

  // Users
  const taEmail = 'ta@tenant-cov1.example';
  const taId = 'usr_cov1_ta';

  const adminUserEmail = 'admin1@tenant-cov1.example';
  const adminUserId = 'usr_cov1_admin1';

  const memberUserEmail = 'member1@tenant-cov1.example';
  const memberUserId = 'usr_cov1_member1';

  const unassignedUserEmail = 'unassigned@tenant-cov1.example';
  const unassignedUserId = 'usr_cov1_unassigned';

  const otherTenantUserEmail = 'other@tenant-cov1-other.example';
  const otherTenantUserId = 'usr_cov1_other';

  let taToken: string;

  beforeAll(async () => {
    if (!isDatabaseConfigured) return;
    const db = getDb();

    // 0. Clean up previous test artifacts
    await db
      .delete(auditLogs)
      .where(sql`${auditLogs.tenantId} IN (${tenantMainId}, ${tenantOtherId})`);
    await db
      .delete(invitations)
      .where(sql`${invitations.tenantId} IN (${tenantMainId}, ${tenantOtherId})`);
    await db
      .delete(tenantAdmins)
      .where(sql`${tenantAdmins.tenantId} IN (${tenantMainId}, ${tenantOtherId})`);
    await db
      .delete(roleAssignments)
      .where(sql`${roleAssignments.tenantId} IN (${tenantMainId}, ${tenantOtherId})`);
    await db
      .delete(memberships)
      .where(sql`${memberships.tenantId} IN (${tenantMainId}, ${tenantOtherId})`);
    await db
      .delete(companies)
      .where(sql`${companies.tenantId} IN (${tenantMainId}, ${tenantOtherId})`);
    await db.delete(tenants).where(sql`${tenants.id} IN (${tenantMainId}, ${tenantOtherId})`);

    // Clean up users
    await db
      .delete(users)
      .where(
        sql`${users.id} IN (${taId}, ${adminUserId}, ${memberUserId}, ${unassignedUserId}, ${otherTenantUserId}) OR ${users.email} LIKE '%@tenant-cov1.example' OR ${users.email} LIKE '%@tenant-cov1-other.example'`,
      );

    // 1. Insert Tenants
    await db.insert(tenants).values([
      { id: tenantMainId, name: 'COV1 Main Tenant', maxCompanies: 5, status: 'active' },
      { id: tenantOtherId, name: 'COV1 Other Tenant', maxCompanies: 5, status: 'active' },
    ]);

    // 2. Insert Companies
    await db.insert(companies).values([
      {
        id: companyAId,
        tenantId: tenantMainId,
        name: 'COV1 Alpha Corp',
        code: 'COV1_ALPHA',
        displayName: 'Alpha Corp',
        status: 'active',
      },
      {
        id: companyBId,
        tenantId: tenantMainId,
        name: 'COV1 Beta Corp',
        code: 'COV1_BETA',
        displayName: 'Beta Corp',
        status: 'active',
      },
      {
        id: companyOtherId,
        tenantId: tenantOtherId,
        name: 'COV1 Other Corp',
        code: 'COV1_OTHER',
        displayName: 'Other Corp',
        status: 'active',
      },
    ]);

    // 3. Insert Users
    const { hash, salt } = hashPassword('TestPassword123!');
    await db.insert(users).values([
      {
        id: taId,
        email: taEmail,
        passwordHash: hash,
        salt,
        firstName: 'Tenant',
        lastName: 'Admin',
        status: 'active',
        isSuperAdmin: false,
      },
      {
        id: adminUserId,
        email: adminUserEmail,
        passwordHash: hash,
        salt,
        firstName: 'Company',
        lastName: 'Administrator',
        status: 'active',
        isSuperAdmin: false,
      },
      {
        id: memberUserId,
        email: memberUserEmail,
        passwordHash: hash,
        salt,
        firstName: 'Standard',
        lastName: 'Member',
        status: 'active',
        isSuperAdmin: false,
      },
      {
        id: unassignedUserId,
        email: unassignedUserEmail,
        passwordHash: hash,
        salt,
        firstName: 'Unassigned',
        lastName: 'User',
        status: 'active',
        isSuperAdmin: false,
      },
      {
        id: otherTenantUserId,
        email: otherTenantUserEmail,
        passwordHash: hash,
        salt,
        firstName: 'OtherTenant',
        lastName: 'User',
        status: 'active',
        isSuperAdmin: false,
      },
    ]);

    // 4. Tenant Admin authority
    await db.insert(tenantAdmins).values({
      id: 'ta_cov1_1',
      tenantId: tenantMainId,
      userId: taId,
      status: 'active',
    });

    // 5. Initial Memberships and Roles for Company Alpha
    // adminUserId is company_admin in Company Alpha
    await db.insert(memberships).values([
      {
        id: 'mem_cov1_admin1',
        userId: adminUserId,
        tenantId: tenantMainId,
        companyId: companyAId,
        role: 'company_admin',
        status: 'active',
      },
      {
        id: 'mem_cov1_member1',
        userId: memberUserId,
        tenantId: tenantMainId,
        companyId: companyAId,
        role: 'user',
        status: 'active',
      },
      // unassignedUserId belongs to Company Beta, but NOT Company Alpha
      {
        id: 'mem_cov1_unassigned',
        userId: unassignedUserId,
        tenantId: tenantMainId,
        companyId: companyBId,
        role: 'user',
        status: 'active',
      },
      // otherTenantUserId belongs to tenantOtherId
      {
        id: 'mem_cov1_other',
        userId: otherTenantUserId,
        tenantId: tenantOtherId,
        companyId: companyOtherId,
        role: 'user',
        status: 'active',
      },
    ]);

    await db.insert(roleAssignments).values([
      {
        id: 'ra_cov1_admin1',
        tenantId: tenantMainId,
        userId: adminUserId,
        companyId: companyAId,
        roleId: 'role_sys_company_admin',
        status: 'active',
      },
      {
        id: 'ra_cov1_member1',
        tenantId: tenantMainId,
        userId: memberUserId,
        companyId: companyAId,
        roleId: 'role_sys_user',
        status: 'active',
      },
    ]);

    // Obtain Tenant Admin token
    const taLogin = await signInForTest(taEmail);
    taToken = taLogin.token;
  });

  it('1. Lists company access users (active members and pending invitations)', async () => {
    if (!isDatabaseConfigured) return;

    const res = await request(app)
      .get(`/api/v1/tenant-admin/companies/${companyAId}/access/users`)
      .set('Authorization', `Bearer ${taToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);

    const admin = res.body.data.find((u: any) => u.userId === adminUserId);
    expect(admin).toBeDefined();
    expect(admin.role).toBe('company_admin');
    expect(admin.roleLabel).toBe('Company Admin');
    expect(admin.status).toBe('active');

    const member = res.body.data.find((u: any) => u.userId === memberUserId);
    expect(member).toBeDefined();
    expect(member.role).toBe('member');
    expect(member.roleLabel).toBe('Member');
  });

  it('2. Lists available tenant users not yet assigned to this company', async () => {
    if (!isDatabaseConfigured) return;

    const res = await request(app)
      .get(`/api/v1/tenant-admin/companies/${companyAId}/access/available-users`)
      .set('Authorization', `Bearer ${taToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    const available = res.body.data;

    // unassignedUser belongs to tenantMainId but not companyAId, so should be listed
    const foundUnassigned = available.find((u: any) => u.userId === unassignedUserId);
    expect(foundUnassigned).toBeDefined();

    // adminUser and memberUser are already in companyAId, so must NOT be in available users
    expect(available.find((u: any) => u.userId === adminUserId)).toBeUndefined();
    expect(available.find((u: any) => u.userId === memberUserId)).toBeUndefined();

    // otherTenantUser belongs to tenantOtherId, so must NOT be in available users
    expect(available.find((u: any) => u.userId === otherTenantUserId)).toBeUndefined();
  });

  it('3. Assigns an existing tenant user to company with Member role', async () => {
    if (!isDatabaseConfigured) return;

    const res = await request(app)
      .post(`/api/v1/tenant-admin/companies/${companyAId}/access/users/assign`)
      .set('Authorization', `Bearer ${taToken}`)
      .send({
        userId: unassignedUserId,
        role: 'member',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.user).toBeDefined();
    expect(res.body.data.user.role).toBe('member');

    // Verify user now shows up in company access users
    const usersRes = await request(app)
      .get(`/api/v1/tenant-admin/companies/${companyAId}/access/users`)
      .set('Authorization', `Bearer ${taToken}`);

    const newlyAssigned = usersRes.body.data.find((u: any) => u.userId === unassignedUserId);
    expect(newlyAssigned).toBeDefined();
    expect(newlyAssigned.role).toBe('member');
  });

  it('4. Rejects cross-tenant user assignment', async () => {
    if (!isDatabaseConfigured) return;

    const res = await request(app)
      .post(`/api/v1/tenant-admin/companies/${companyAId}/access/users/assign`)
      .set('Authorization', `Bearer ${taToken}`)
      .send({
        userId: otherTenantUserId,
        role: 'member',
      });

    expect(res.status).toBe(400);
    expect(res.body.error?.message || res.body.message).toMatch(/CROSS_TENANT|Cross-tenant/i);
  });

  it('5. Invites a new user to the company', async () => {
    if (!isDatabaseConfigured) return;

    const newInviteEmail = 'newhire.invite@tenant-cov1.example';
    const res = await request(app)
      .post(`/api/v1/tenant-admin/companies/${companyAId}/access/users/invite`)
      .set('Authorization', `Bearer ${taToken}`)
      .send({
        email: newInviteEmail,
        firstName: 'New',
        lastName: 'Hire',
        role: 'member',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.invitation).toBeDefined();
    expect(res.body.data.invitation.status).toBe('pending');
    expect(res.body.data.invitation.email).toBe(newInviteEmail);

    // Verify invitation shows in company access users directory
    const usersRes = await request(app)
      .get(`/api/v1/tenant-admin/companies/${companyAId}/access/users`)
      .set('Authorization', `Bearer ${taToken}`);

    const pendingInv = usersRes.body.data.find(
      (u: any) => u.email === newInviteEmail && u.isInvitation,
    );
    expect(pendingInv).toBeDefined();
    expect(pendingInv.isInvitation).toBe(true);
    expect(pendingInv.status).toBe('pending_invitation');
  });

  it('6. Rejects inviting a user that belongs to an external tenant', async () => {
    if (!isDatabaseConfigured) return;

    const res = await request(app)
      .post(`/api/v1/tenant-admin/companies/${companyAId}/access/users/invite`)
      .set('Authorization', `Bearer ${taToken}`)
      .send({
        email: otherTenantUserEmail,
        role: 'member',
      });

    expect(res.status).toBe(400);
    expect(res.body.error?.message || res.body.message).toMatch(/CROSS_TENANT|Cross-tenant user invitation is prohibited/i);
  });

  it('7. Updates company user role (promote Member to Company Admin)', async () => {
    if (!isDatabaseConfigured) return;

    const res = await request(app)
      .patch(`/api/v1/tenant-admin/companies/${companyAId}/access/users/${memberUserId}/role`)
      .set('Authorization', `Bearer ${taToken}`)
      .send({
        role: 'company_admin',
      });

    expect(res.status).toBe(200);

    const usersRes = await request(app)
      .get(`/api/v1/tenant-admin/companies/${companyAId}/access/users`)
      .set('Authorization', `Bearer ${taToken}`);

    const updated = usersRes.body.data.find((u: any) => u.userId === memberUserId);
    expect(updated.role).toBe('company_admin');
  });

  it('8. Enforces Last Company Admin safety rule on demotion', async () => {
    if (!isDatabaseConfigured) return;

    // First demote memberUser back to member so adminUser is the sole company admin
    await request(app)
      .patch(`/api/v1/tenant-admin/companies/${companyAId}/access/users/${memberUserId}/role`)
      .set('Authorization', `Bearer ${taToken}`)
      .send({ role: 'member' });

    // Now try to demote the sole company admin (adminUser)
    const res = await request(app)
      .patch(`/api/v1/tenant-admin/companies/${companyAId}/access/users/${adminUserId}/role`)
      .set('Authorization', `Bearer ${taToken}`)
      .send({
        role: 'member',
      });

    expect(res.status).toBe(400);
    expect(res.body.error?.message || res.body.message).toMatch(/sole active Company Administrator|CANNOT_REMOVE_LAST_COMPANY_ADMIN/i);
  });

  it('9. Enforces Last Company Admin safety rule on revocation', async () => {
    if (!isDatabaseConfigured) return;

    const res = await request(app)
      .delete(`/api/v1/tenant-admin/companies/${companyAId}/access/users/${adminUserId}`)
      .set('Authorization', `Bearer ${taToken}`);

    expect(res.status).toBe(400);
    expect(res.body.error?.message || res.body.message).toMatch(/sole active Company Administrator|CANNOT_REMOVE_LAST_COMPANY_ADMIN/i);
  });

  it('10. Revokes company access for a standard member successfully', async () => {
    if (!isDatabaseConfigured) return;

    const res = await request(app)
      .delete(`/api/v1/tenant-admin/companies/${companyAId}/access/users/${memberUserId}`)
      .set('Authorization', `Bearer ${taToken}`);

    expect(res.status).toBe(200);

    // Verify member is no longer in active company users list
    const usersRes = await request(app)
      .get(`/api/v1/tenant-admin/companies/${companyAId}/access/users`)
      .set('Authorization', `Bearer ${taToken}`);

    const revokedUser = usersRes.body.data.find((u: any) => u.userId === memberUserId);
    expect(revokedUser?.status).toBe('revoked');
  });

  it('11. Resends and cancels a pending company invitation', async () => {
    if (!isDatabaseConfigured) return;

    // Find the pending invitation created earlier
    const usersRes = await request(app)
      .get(`/api/v1/tenant-admin/companies/${companyAId}/access/users`)
      .set('Authorization', `Bearer ${taToken}`);

    const inv = usersRes.body.data.find((u: any) => u.isInvitation && u.status === 'pending_invitation');
    expect(inv).toBeDefined();

    // 11a. Resend
    const resendRes = await request(app)
      .post(`/api/v1/tenant-admin/companies/${companyAId}/access/invitations/${inv.invitationId}/resend`)
      .set('Authorization', `Bearer ${taToken}`);

    expect(resendRes.status).toBe(200);

    // 11b. Cancel
    const cancelRes = await request(app)
      .delete(`/api/v1/tenant-admin/companies/${companyAId}/access/invitations/${inv.invitationId}`)
      .set('Authorization', `Bearer ${taToken}`);

    expect(cancelRes.status).toBe(200);

    // Verify invitation is no longer listed in active/pending directory
    const afterCancelRes = await request(app)
      .get(`/api/v1/tenant-admin/companies/${companyAId}/access/users`)
      .set('Authorization', `Bearer ${taToken}`);

    const cancelledInv = afterCancelRes.body.data.find((u: any) => u.invitationId === inv.invitationId);
    expect(cancelledInv).toBeUndefined();
  });

  it('12. Returns company roles & permissions overview with disclaimers', async () => {
    if (!isDatabaseConfigured) return;

    const res = await request(app)
      .get(`/api/v1/tenant-admin/companies/${companyAId}/access/roles-overview`)
      .set('Authorization', `Bearer ${taToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(2);

    const memberRole = res.body.data.find((r: any) => r.code === 'member');
    expect(memberRole).toBeDefined();
    expect(memberRole.name).toBe('Member');
    expect(memberRole.disclaimer).toMatch(/Application permissions.*separately/i);

    const adminRole = res.body.data.find((r: any) => r.code === 'company_admin');
    expect(adminRole).toBeDefined();
    expect(adminRole.name).toBe('Company Administrator');
    expect(adminRole.disclaimer).toMatch(/Does not grant Tenant Administrator authority/i);
  });
});
