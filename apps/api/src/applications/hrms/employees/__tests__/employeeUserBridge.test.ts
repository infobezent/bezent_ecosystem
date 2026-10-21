import { describe, it, expect, beforeAll } from 'vitest';
import { getDb, isDatabaseConfigured } from '../../../../db/connection.js';
import { users, memberships, employees, companies, tenants } from '../../../../db/schema.js';
import { eq, and } from 'drizzle-orm';
import {
  provisionUserForEmployee,
  DEFAULT_EMPLOYEE_PASSWORD,
  syncAllUnlinkedEmployees,
} from '../service/employeeUserBridge.service.js';
import { verifyPassword, generateSurrogateId } from '../../../../platform/auth/security.js';

describe('Employee User Bridge & ESS Auto-Provisioning', () => {
  const tenantId = 'tnt_bridge_test';
  const companyId = 'comp_bridge_test';

  beforeAll(async () => {
    if (!isDatabaseConfigured) return;
    const db = getDb();

    await db
      .insert(tenants)
      .values({ id: tenantId, name: 'Bridge Test Tenant', status: 'active' })
      .onDuplicateKeyUpdate({ set: { status: 'active' } });

    await db
      .insert(companies)
      .values({
        id: companyId,
        tenantId,
        name: 'Bridge Test Company',
        code: 'BTC',
        status: 'active',
      })
      .onDuplicateKeyUpdate({ set: { status: 'active' } });
  });

  it('provisions a User account with Password@1234 and active membership for a new employee', async () => {
    if (!isDatabaseConfigured) return;
    const db = getDb();

    const empId = generateSurrogateId('emp');
    const empEmail = `test_bridge_${Date.now()}@test.example`;

    await db.insert(employees).values({
      id: empId,
      tenantId,
      companyId,
      employeeNumber: `EMP-${Date.now().toString().slice(-4)}`,
      firstName: 'Ramesh',
      lastName: 'Kumar',
      email: empEmail,
      employmentStatus: 'active',
      employmentType: 'full_time',
      joiningDate: '2026-01-01',
    });

    const userId = await provisionUserForEmployee(tenantId, companyId, {
      id: empId,
      email: empEmail,
      firstName: 'Ramesh',
      lastName: 'Kumar',
    });

    expect(userId).toBeDefined();
    expect(typeof userId).toBe('string');

    // 1. Verify user created
    const [createdUser] = await db.select().from(users).where(eq(users.id, userId!));
    expect(createdUser).toBeDefined();
    if (!createdUser) throw new Error('User not found');
    expect(createdUser.email).toBe(empEmail.toLowerCase());
    expect(createdUser.status).toBe('active');
    expect(createdUser.passwordHash).toBeDefined();
    expect(createdUser.salt).toBeDefined();

    // 2. Verify password matches 'Password@1234'
    const passwordValid = verifyPassword(
      DEFAULT_EMPLOYEE_PASSWORD,
      createdUser.passwordHash!,
      createdUser.salt!,
    );
    expect(passwordValid).toBe(true);

    // 3. Verify membership created with 'employee' role
    const [membership] = await db
      .select()
      .from(memberships)
      .where(
        and(
          eq(memberships.tenantId, tenantId),
          eq(memberships.companyId, companyId),
          eq(memberships.userId, userId!),
        ),
      );
    expect(membership).toBeDefined();
    if (!membership) throw new Error('Membership not found');
    expect(membership.role).toBe('employee');
    expect(membership.status).toBe('active');

    // 4. Verify employee.userId is linked
    const [updatedEmp] = await db.select().from(employees).where(eq(employees.id, empId));
    expect(updatedEmp).toBeDefined();
    if (!updatedEmp) throw new Error('Employee not found');
    expect(updatedEmp.userId).toBe(userId);
  });

  it('syncAllUnlinkedEmployees automatically catches and provisions unlinked employees', async () => {
    if (!isDatabaseConfigured) return;
    const db = getDb();

    const empId = generateSurrogateId('emp');
    const empEmail = `unlinked_sync_${Date.now()}@test.example`;

    await db.insert(employees).values({
      id: empId,
      tenantId,
      companyId,
      employeeNumber: `EMP-U${Date.now().toString().slice(-4)}`,
      firstName: 'Suresh',
      lastName: 'Raina',
      email: empEmail,
      userId: null,
      employmentStatus: 'active',
      employmentType: 'full_time',
      joiningDate: '2026-01-01',
    });

    const count = await syncAllUnlinkedEmployees();
    expect(count).toBeGreaterThanOrEqual(1);

    const [syncedEmp] = await db.select().from(employees).where(eq(employees.id, empId));
    expect(syncedEmp).toBeDefined();
    if (!syncedEmp) throw new Error('Employee not found');
    expect(syncedEmp.userId).toBeTruthy();

    const [syncedUser] = await db.select().from(users).where(eq(users.id, syncedEmp.userId!));
    expect(syncedUser).toBeDefined();
    if (!syncedUser) throw new Error('User not found');
    expect(syncedUser.email).toBe(empEmail.toLowerCase());
    expect(
      verifyPassword(DEFAULT_EMPLOYEE_PASSWORD, syncedUser.passwordHash!, syncedUser.salt!),
    ).toBe(true);
  });
});
