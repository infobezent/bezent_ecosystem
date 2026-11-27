import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getDb, isDatabaseConfigured } from '../../../../db/connection.js';
import {
  users,
  memberships,
  employees,
  companies,
  tenants,
  invitations,
  roleAssignments,
  workforceGeneralSettings,
} from '../../../../db/schema.js';
import { eq, and, inArray } from 'drizzle-orm';
import {
  provisionUserForEmployee,
  syncAllUnlinkedEmployees,
} from '../service/employeeUserBridge.service.js';
import { generateSurrogateId } from '../../../../platform/auth/security.js';
import { systemRoleIdForCode } from '../../../../platform/access/catalog/accessCatalog.js';

describe('Employee User Bridge & ESS Auto-Provisioning (C6)', () => {
  const tenantId = 'tnt_bridge_test';
  const companyId = 'comp_bridge_test';
  /** A second company used only for the autoProvisionUser:false case, so it never affects the other tests. */
  const noAutoProvisionCompanyId = 'comp_bridge_test_noauto';

  const createdEmployeeIds: string[] = [];
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    if (!isDatabaseConfigured) return;
    const db = getDb();

    await db
      .insert(tenants)
      .values({ id: tenantId, name: 'Bridge Test Tenant', status: 'active' })
      .onDuplicateKeyUpdate({ set: { status: 'active' } });

    await db
      .insert(companies)
      .values([
        {
          id: companyId,
          tenantId,
          name: 'Bridge Test Company',
          code: 'BTC',
          status: 'active',
        },
        {
          id: noAutoProvisionCompanyId,
          tenantId,
          name: 'Bridge Test Company (No Auto Provision)',
          code: 'BTCN',
          status: 'active',
        },
      ])
      .onDuplicateKeyUpdate({ set: { status: 'active' } });

    // This company has autoProvisionUser explicitly disabled.
    await db
      .insert(workforceGeneralSettings)
      .values({
        id: generateSurrogateId('wfs'),
        tenantId,
        companyId: noAutoProvisionCompanyId,
        generationMode: 'automatic',
        idPrefix: 'EMP-',
        sequenceLength: 4,
        startingNumber: 1001,
        currentCounter: 1000,
        resetFrequency: 'never',
        allowManualOverride: true,
        preventIdReuse: true,
        autoProvisionUser: false,
        activationTiming: 'instant',
      })
      .onDuplicateKeyUpdate({ set: { autoProvisionUser: false } });
  });

  afterAll(async () => {
    if (!isDatabaseConfigured) return;
    const db = getDb();
    await db.delete(invitations).where(eq(invitations.tenantId, tenantId));
    if (createdUserIds.length > 0) {
      await db.delete(roleAssignments).where(inArray(roleAssignments.userId, createdUserIds));
      await db.delete(memberships).where(inArray(memberships.userId, createdUserIds));
    }
    if (createdEmployeeIds.length > 0) {
      await db.delete(employees).where(inArray(employees.id, createdEmployeeIds));
    }
    if (createdUserIds.length > 0) {
      await db.delete(users).where(inArray(users.id, createdUserIds));
    }
    await db
      .delete(workforceGeneralSettings)
      .where(eq(workforceGeneralSettings.companyId, noAutoProvisionCompanyId));
  });

  async function insertEmployee(overrides: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    employmentStatus: 'active' | 'resigned' | 'terminated' | 'suspended' | 'pending_activation';
    companyId?: string;
  }) {
    const db = getDb();
    await db.insert(employees).values({
      id: overrides.id,
      tenantId,
      companyId: overrides.companyId ?? companyId,
      employeeNumber: `EMP-${overrides.id.slice(-6)}`,
      firstName: overrides.firstName,
      lastName: overrides.lastName,
      email: overrides.email,
      employmentStatus: overrides.employmentStatus,
      employmentType: 'full_time',
      joiningDate: '2026-01-01',
    });
    createdEmployeeIds.push(overrides.id);
  }

  it('provisions a passwordless user, active membership, role assignment, and a pending invitation for a new employee', async () => {
    if (!isDatabaseConfigured) return;
    const db = getDb();

    const empId = generateSurrogateId('emp');
    const empEmail = `test_bridge_${Date.now()}@test.example`;
    await insertEmployee({
      id: empId,
      email: empEmail,
      firstName: 'Ramesh',
      lastName: 'Kumar',
      employmentStatus: 'active',
    });

    const userId = await provisionUserForEmployee(tenantId, companyId, {
      id: empId,
      email: empEmail,
      firstName: 'Ramesh',
      lastName: 'Kumar',
    });
    expect(userId).toBeDefined();
    createdUserIds.push(userId!);

    // 1. User created, passwordless (no usable credential is ever issued -- ADR-018)
    const [createdUser] = await db.select().from(users).where(eq(users.id, userId!));
    expect(createdUser).toBeDefined();
    expect(createdUser!.email).toBe(empEmail.toLowerCase());
    expect(createdUser!.status).toBe('active');
    expect(createdUser!.passwordHash).toBeDefined();
    expect(createdUser!.salt).toBeDefined();

    // 2. Membership created, active, role 'employee'
    const [membership] = await db
      .select()
      .from(memberships)
      .where(and(eq(memberships.companyId, companyId), eq(memberships.userId, userId!)));
    expect(membership).toBeDefined();
    expect(membership!.role).toBe('employee');
    expect(membership!.status).toBe('active');

    // 3. Role assignment created (this is what actually grants permissions --
    // the membership.role column alone is not read by the access resolver).
    const [assignment] = await db
      .select()
      .from(roleAssignments)
      .where(
        and(
          eq(roleAssignments.userId, userId!),
          eq(roleAssignments.companyId, companyId),
          eq(roleAssignments.roleId, systemRoleIdForCode('employee')),
        ),
      );
    expect(assignment).toBeDefined();
    expect(assignment!.status).toBe('active');

    // 4. Invitation row created for sign-in instructions, same mechanism as an admin invite
    const [invitation] = await db
      .select()
      .from(invitations)
      .where(eq(invitations.email, empEmail.toLowerCase()));
    expect(invitation).toBeDefined();
    expect(invitation!.role).toBe('employee');
    expect(invitation!.status).toBe('pending');
    expect(invitation!.invitedByUserId).toBeNull();

    // 5. Employee linked
    const [updatedEmp] = await db.select().from(employees).where(eq(employees.id, empId));
    expect(updatedEmp!.userId).toBe(userId);
  });

  it('syncAllUnlinkedEmployees provisions an unlinked active employee', async () => {
    if (!isDatabaseConfigured) return;
    const db = getDb();

    const empId = generateSurrogateId('emp');
    const empEmail = `unlinked_sync_${Date.now()}@test.example`;
    await insertEmployee({
      id: empId,
      email: empEmail,
      firstName: 'Suresh',
      lastName: 'Raina',
      employmentStatus: 'active',
    });

    const countBefore = await syncAllUnlinkedEmployees();
    expect(countBefore).toBeGreaterThanOrEqual(1);

    const [syncedEmp] = await db.select().from(employees).where(eq(employees.id, empId));
    expect(syncedEmp!.userId).toBeTruthy();
    createdUserIds.push(syncedEmp!.userId!);

    const [syncedUser] = await db.select().from(users).where(eq(users.id, syncedEmp!.userId!));
    expect(syncedUser).toBeDefined();
    expect(syncedUser!.email).toBe(empEmail.toLowerCase());
  });

  it('syncAllUnlinkedEmployees does not provision a resigned employee', async () => {
    if (!isDatabaseConfigured) return;
    const db = getDb();

    const empId = generateSurrogateId('emp');
    const empEmail = `resigned_sync_${Date.now()}@test.example`;
    await insertEmployee({
      id: empId,
      email: empEmail,
      firstName: 'Ravi',
      lastName: 'Shastri',
      employmentStatus: 'resigned',
    });

    await syncAllUnlinkedEmployees();

    const [syncedEmp] = await db.select().from(employees).where(eq(employees.id, empId));
    expect(syncedEmp!.userId).toBeFalsy();

    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, empEmail.toLowerCase()));
    expect(existingUser.length).toBe(0);
  });

  it('syncAllUnlinkedEmployees skips a company with autoProvisionUser disabled', async () => {
    if (!isDatabaseConfigured) return;
    const db = getDb();

    const empId = generateSurrogateId('emp');
    const empEmail = `noauto_sync_${Date.now()}@test.example`;
    await insertEmployee({
      id: empId,
      email: empEmail,
      firstName: 'Virat',
      lastName: 'Kohli',
      employmentStatus: 'active',
      companyId: noAutoProvisionCompanyId,
    });

    await syncAllUnlinkedEmployees();

    const [syncedEmp] = await db.select().from(employees).where(eq(employees.id, empId));
    expect(syncedEmp!.userId).toBeFalsy();

    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, empEmail.toLowerCase()));
    expect(existingUser.length).toBe(0);
  });

  it('never reactivates a membership that is inactive or revoked', async () => {
    if (!isDatabaseConfigured) return;
    const db = getDb();

    const empId = generateSurrogateId('emp');
    const empEmail = `revoked_bridge_${Date.now()}@test.example`;
    await insertEmployee({
      id: empId,
      email: empEmail,
      firstName: 'Anil',
      lastName: 'Kumble',
      employmentStatus: 'active',
    });

    // Simulate a previously-provisioned, then revoked, employee (e.g. C6 separation).
    const userId = generateSurrogateId('usr');
    createdUserIds.push(userId);
    await db.insert(users).values({
      id: userId,
      email: empEmail.toLowerCase(),
      firstName: 'Anil',
      lastName: 'Kumble',
      status: 'active',
      passwordHash: 'x',
      salt: 'x',
      isSuperAdmin: false,
    });
    await db.insert(memberships).values({
      id: generateSurrogateId('mem'),
      userId,
      tenantId,
      companyId,
      role: 'employee',
      status: 'revoked',
    });
    await db.update(employees).set({ userId }).where(eq(employees.id, empId));

    // Re-running provisioning (e.g. an "API restart") must not touch the revoked membership.
    const result = await provisionUserForEmployee(tenantId, companyId, {
      id: empId,
      email: empEmail,
      firstName: 'Anil',
      lastName: 'Kumble',
      userId,
    });
    expect(result).toBe(userId);

    const allMemberships = await db
      .select()
      .from(memberships)
      .where(and(eq(memberships.companyId, companyId), eq(memberships.userId, userId)));
    expect(allMemberships.length).toBe(1);
    expect(allMemberships[0]!.status).toBe('revoked');

    // Also: this employment status is still 'active', so it would be picked up by
    // syncAllUnlinkedEmployees if it had no userId -- but it already has one, so
    // the sync path is not exercised here; the direct re-provision call above is
    // the realistic trigger (e.g. employee.service.ts re-provisioning on edit).
  });
});
