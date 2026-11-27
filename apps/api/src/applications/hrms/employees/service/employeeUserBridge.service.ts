import crypto from 'crypto';
import { eq, sql, and, or, isNull } from 'drizzle-orm';
import { getDb, isDatabaseConfigured } from '../../../../db/connection.js';
import { users, employees } from '../../../../db/schema.js';
import {
  createUnusableCredential,
  generateSurrogateId,
} from '../../../../platform/auth/security.js';
import { companyAdminRepository } from '../../../../platform/company-admin/repository/companyAdmin.repository.js';
import { roleManagementService } from '../../../../platform/access/service/roleManagement.service.js';
import { workforceSettingsRepository } from '../../workforce/repository/workforceSettings.repository.js';

/** Matches the admin-invitation TTL in companyAdmin.service.ts (INVITATION_TTL_DAYS). */
const EMPLOYEE_INVITATION_TTL_DAYS = 7;

/**
 * Provisions a User identity and company membership for an Employee, reusing
 * the same passwordless-identity and invitation building blocks as an admin
 * invite (companyAdmin.service.ts inviteUser()/acceptInvitation()) so this
 * never diverges into a second onboarding architecture. The identity is
 * passwordless and signs in with Email OTP (ADR-018) -- no password is ever
 * set, issued, or stored for sign-in purposes.
 *
 * An existing membership that is not 'active' (inactive/revoked) is left
 * untouched: this function must never silently reactivate access that was
 * deliberately disabled or revoked (see C6).
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
    const { hash, salt } = createUnusableCredential();

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
  }

  // 2. Ensure a company membership + role assignment exist for the employee
  // role. An existing membership is NEVER touched here, regardless of its
  // status -- only a brand-new membership is created.
  const existingMem = await companyAdminRepository.findMembership(companyId, userId);

  if (!existingMem) {
    await getDb().transaction(async (tx) => {
      await companyAdminRepository.createMembership(
        {
          id: generateSurrogateId('mem'),
          userId,
          tenantId,
          companyId,
          role: 'employee',
          status: 'active',
        },
        tx,
      );
      await roleManagementService.syncMembershipRole(tx, {
        userId,
        tenantId,
        companyId,
        role: 'employee',
        actorId: userId,
      });
    });

    // Paper trail + sign-in instructions, same mechanism an admin invite uses.
    const token = crypto.randomBytes(32).toString('hex');
    await companyAdminRepository.createInvitation({
      id: generateSurrogateId('inv'),
      tenantId,
      companyId,
      email: normalizedEmail,
      role: 'employee',
      authorityType: 'company_role',
      token,
      invitedByUserId: null,
      status: 'pending',
      expiresAt: new Date(Date.now() + EMPLOYEE_INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000),
    });
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

    // Find all unlinked employees who have not left the company. Separated
    // employees (terminated/resigned) and suspended employees are never
    // auto-provisioned (see C6).
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
          sql`${employees.employmentStatus} NOT IN ('terminated', 'suspended', 'resigned')`,
          or(isNull(employees.userId), eq(employees.userId, '')),
        ),
      );

    // A company with autoProvisionUser explicitly disabled opts out of all
    // automatic provisioning. Settings are resolved per company and cached
    // for the duration of this sync run.
    const autoProvisionByCompany = new Map<string, boolean>();

    let provisionedCount = 0;
    for (const emp of unlinkedEmployees) {
      try {
        const cacheKey = `${emp.tenantId}:${emp.companyId}`;
        let autoProvisionUser = autoProvisionByCompany.get(cacheKey);
        if (autoProvisionUser === undefined) {
          const settings = await workforceSettingsRepository.getGeneralSettings(
            emp.tenantId,
            emp.companyId,
          );
          // No settings row yet defaults to enabled, matching the seeded default.
          autoProvisionUser = settings?.autoProvisionUser ?? true;
          autoProvisionByCompany.set(cacheKey, autoProvisionUser);
        }
        if (!autoProvisionUser) continue;

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
