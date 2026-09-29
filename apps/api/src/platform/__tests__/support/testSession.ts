import { authRepository } from '../../auth/repository/auth.repository.js';
import { authService } from '../../auth/service/auth.service.js';
import { hashPassword } from '../../auth/security.js';
import type { LoginResult } from '../../auth/types/auth.types.js';
import { and, eq, inArray } from 'drizzle-orm';
import { getDb } from '../../../db/connection.js';
import { companies, memberships, roleAssignments, tenants, users } from '../../../db/schema.js';

const HRMS_TEST_USER_ID = 'usr_hrms_test_operator';
const HRMS_TEST_EMAIL = 'hrms.test.operator@bezent-test.example';
let hrmsToken: string | undefined;

/**
 * TEST FIXTURE ONLY. Grants the shared HRMS test operator the system HR role
 * (`hr_manager`) in a company, creating the tenant/company rows when a suite
 * uses its own synthetic company. Returns the headers an authorized HRMS
 * client sends: a session token and the selected company. Every HRMS request
 * in tests therefore passes the real auth + RBAC chain.
 */
export async function hrmsTestHeaders(
  companyId = 'comp_demo_01',
  tenantId = 'tenant_demo_01',
): Promise<Record<string, string>> {
  const db = getDb();
  // The seeded demo company is never created here (the seed owns it); only a
  // suite's synthetic companies are created on demand.
  if (companyId !== 'comp_demo_01') {
    await db
      .insert(tenants)
      .ignore()
      .values({ id: tenantId, name: `Test tenant ${tenantId}` });
    await db
      .insert(companies)
      .ignore()
      .values({
        id: companyId,
        tenantId,
        name: `Test company ${companyId}`,
        code: companyId.slice(0, 50),
      });
  }

  const unused = hashPassword('not-used-by-otp');
  await db.insert(users).ignore().values({
    id: HRMS_TEST_USER_ID,
    email: HRMS_TEST_EMAIL,
    passwordHash: unused.hash,
    salt: unused.salt,
    firstName: 'HRMS',
    lastName: 'Test Operator',
  });
  await db
    .insert(memberships)
    .values({
      id: `mem_hrmsop_${companyId}`.slice(0, 64),
      userId: HRMS_TEST_USER_ID,
      tenantId,
      companyId,
      role: 'hr_manager',
      status: 'active',
    })
    .onDuplicateKeyUpdate({ set: { status: 'active' } });
  await db
    .insert(roleAssignments)
    .values({
      id: `ra_hrmsop_${companyId}`.slice(0, 64),
      userId: HRMS_TEST_USER_ID,
      roleId: 'role_sys_hr_manager',
      tenantId,
      companyId,
      status: 'active',
    })
    .onDuplicateKeyUpdate({ set: { status: 'active' } });

  hrmsToken ??= (await signInForTest(HRMS_TEST_EMAIL)).token;
  // Lower-case keys so a per-request `.set('x-company-id', …)` overrides cleanly.
  return { authorization: `Bearer ${hrmsToken}`, 'x-company-id': companyId };
}

/**
 * TEST FIXTURE ONLY. Removes the HRMS test operator's fixture rows for
 * companies a suite is about to delete (they reference the company).
 */
export async function removeHrmsTestAccess(companyIds: string[]): Promise<void> {
  const db = getDb();
  await db
    .delete(roleAssignments)
    .where(
      and(
        eq(roleAssignments.userId, HRMS_TEST_USER_ID),
        inArray(roleAssignments.companyId, companyIds),
      ),
    );
  await db
    .delete(memberships)
    .where(
      and(eq(memberships.userId, HRMS_TEST_USER_ID), inArray(memberships.companyId, companyIds)),
    );
}

/**
 * TEST FIXTURE ONLY. Opens a session for a seeded test user through the one
 * session system, skipping the email round-trip so suites that test
 * authorization do not depend on OTP delivery. The OTP flow itself is covered
 * end to end in otpAuth.test.ts. Not reachable through any HTTP route.
 */
export async function signInForTest(email: string): Promise<LoginResult> {
  const user = await authRepository.findUserByEmail(email);
  if (!user) {
    throw new Error(`Test user '${email}' does not exist`);
  }
  return authService.issueSession(user);
}
