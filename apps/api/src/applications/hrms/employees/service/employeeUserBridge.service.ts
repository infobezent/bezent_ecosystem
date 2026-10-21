import { eq, and, sql, or, isNull } from 'drizzle-orm';
import { getDb, isDatabaseConfigured } from '../../../../db/connection.js';
import { users, memberships, employees } from '../../../../db/schema.js';
import { hashPassword, generateSurrogateId } from '../../../../platform/auth/security.js';

export const DEFAULT_EMPLOYEE_PASSWORD = 'Password@1234';

/**
 * Provisions a User identity and company membership for an Employee.
 * Sets the default login password to 'Password@1234' for seamless developer
 * and UAT reviewer authentication, bridging User and Employee models (ADR-009).
 */
export async function provisionUserForEmployee(
  tenantId: string,
  companyId: string,
  emp: {
    id: string;
    email: string;
    firstName: string;
    lastName?: string | null;
    userId?: string | null;
  },
): Promise<string | null> {
  if (!isDatabaseConfigured) return null;

  const db = getDb();
  const normalizedEmail = emp.email.trim().toLowerCase();

  // 1. Check if a User identity with this email already exists
  const [existingUser] = await db
    .select()
    .from(users)
    .where(eq(sql`LOWER(${users.email})`, normalizedEmail));

  let userId: string;

  if (!existingUser) {
    userId = generateSurrogateId('usr');
    const { hash, salt } = hashPassword(DEFAULT_EMPLOYEE_PASSWORD);

    await db.insert(users).values({
      id: userId,
      email: normalizedEmail,
      firstName: emp.firstName,
      lastName: emp.lastName ?? '',
      status: 'active',
      passwordHash: hash,
      salt,
      isSuperAdmin: false,
    });
  } else {
    userId = existingUser.id;
    // If the user does not have a password or is missing salt, update with default password
    if (!existingUser.passwordHash || !existingUser.salt) {
      const { hash, salt } = hashPassword(DEFAULT_EMPLOYEE_PASSWORD);
      await db
        .update(users)
        .set({ passwordHash: hash, salt, status: 'active' })
        .where(eq(users.id, userId));
    }
  }

  // 2. Ensure company membership exists with 'employee' role
  const [existingMem] = await db
    .select()
    .from(memberships)
    .where(
      and(
        eq(memberships.tenantId, tenantId),
        eq(memberships.companyId, companyId),
        eq(memberships.userId, userId),
      ),
    );

  if (!existingMem) {
    await db.insert(memberships).values({
      id: generateSurrogateId('mem'),
      tenantId,
      companyId,
      userId,
      role: 'employee',
      status: 'active',
    });
  } else if (existingMem.status !== 'active') {
    await db
      .update(memberships)
      .set({ status: 'active' })
      .where(eq(memberships.id, existingMem.id));
  }

  // 3. Link employee.userId if not linked or mismatched
  if (!emp.userId || emp.userId !== userId) {
    await db.update(employees).set({ userId }).where(eq(employees.id, emp.id));
  }

  return userId;
}

/**
 * Reconciles and provisions User accounts for any active employees in the database
 * that lack linked User identities or company memberships.
 * Runs once during API startup so deployed instances (e.g. Render) immediately
 * enable ESS login for existing employee records like Mukesh Kannan.
 */
export async function syncAllUnlinkedEmployees(): Promise<number> {
  if (!isDatabaseConfigured) return 0;

  try {
    const db = getDb();

    // Find all active employees whose userId is null or empty
    const unlinkedEmployees = await db
      .select({
        id: employees.id,
        tenantId: employees.tenantId,
        companyId: employees.companyId,
        email: employees.email,
        firstName: employees.firstName,
        lastName: employees.lastName,
        userId: employees.userId,
      })
      .from(employees)
      .where(
        and(
          sql`${employees.employmentStatus} NOT IN ('terminated', 'suspended')`,
          or(isNull(employees.userId), eq(employees.userId, '')),
        ),
      );

    let provisionedCount = 0;
    for (const emp of unlinkedEmployees) {
      try {
        await provisionUserForEmployee(emp.tenantId, emp.companyId, emp);
        provisionedCount++;
      } catch (err) {
        console.warn(`[auth:bridge] Failed to provision user for employee ${emp.email}:`, err);
      }
    }

    return provisionedCount;
  } catch (err) {
    console.warn('[auth:bridge] syncAllUnlinkedEmployees encountered error:', err);
    return 0;
  }
}
