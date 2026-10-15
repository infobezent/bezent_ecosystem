import crypto from 'node:crypto';
import { getDb, isDatabaseConfigured, closePool } from '../src/db/connection.js';
import {
  users,
  memberships,
  roleAssignments,
  tenants,
  companies,
} from '../src/db/schema.js';
import { eq, and } from 'drizzle-orm';
import { hashPassword, generateSurrogateId } from '../src/platform/auth/security.js';
import { getDeploymentEnv } from '../src/app/config/env.js';

interface ProvisionOptions {
  email: string;
  role: 'super_admin' | 'company_admin' | 'hr_manager' | 'manager' | 'employee';
  firstName?: string;
  lastName?: string;
  tenantId?: string;
  companyId?: string;
}

function parseArgs(): ProvisionOptions {
  const args = process.argv.slice(2);
  const options: Partial<ProvisionOptions> = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--email' && args[i + 1]) options.email = args[++i];
    else if (arg === '--role' && args[i + 1]) options.role = args[++i] as ProvisionOptions['role'];
    else if (arg === '--firstName' && args[i + 1]) options.firstName = args[++i];
    else if (arg === '--lastName' && args[i + 1]) options.lastName = args[++i];
    else if (arg === '--tenantId' && args[i + 1]) options.tenantId = args[++i];
    else if (arg === '--companyId' && args[i + 1]) options.companyId = args[++i];
  }

  if (!options.email) {
    console.error('Error: --email is required.');
    console.error('Usage: tsx scripts/provision-reviewer.ts --email <email> [--role <role>]');
    process.exit(1);
  }

  const validRoles = ['super_admin', 'company_admin', 'hr_manager', 'manager', 'employee'];
  const role = options.role ?? 'hr_manager';
  if (!validRoles.includes(role)) {
    console.error(`Error: Invalid role '${role}'. Valid roles: ${validRoles.join(', ')}`);
    process.exit(1);
  }

  return {
    email: options.email.trim().toLowerCase(),
    role,
    firstName: options.firstName ?? 'Reviewer',
    lastName: options.lastName ?? (role.replace('_', ' ').toUpperCase()),
    tenantId: options.tenantId ?? 'tenant_demo_01',
    companyId: options.companyId ?? 'comp_demo_01',
  };
}

async function main() {
  const deploymentEnv = getDeploymentEnv();
  if (deploymentEnv === 'production' || deploymentEnv === 'prod') {
    console.error('[Safety Blocker] Cannot run reviewer provisioning script directly in production deployment.');
    process.exit(1);
  }

  if (!isDatabaseConfigured) {
    console.error('[Error] Database is not configured. Set DATABASE_URL or DB_* environment variables.');
    process.exit(1);
  }

  const opts = parseArgs();
  const db = getDb();

  // Create initial secure credential material
  const { hash, salt } = hashPassword(crypto.randomBytes(32).toString('hex'));

  console.log(`[Provisioning] Target user: ${opts.email} (${opts.role}) in ${deploymentEnv}...`);

  // Verify tenant and company exist
  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, opts.tenantId!));
  const [company] = await db.select().from(companies).where(eq(companies.id, opts.companyId!));

  if (!tenant || !company) {
    console.error(`[Error] Target tenant (${opts.tenantId}) or company (${opts.companyId}) not found in database.`);
    console.error('Please ensure the database is seeded first (npm run db:seed).');
    await closePool();
    process.exit(1);
  }

  // 1. Create or update User
  const existingUsers = await db.select().from(users).where(eq(users.email, opts.email));
  let userId: string;
  const isSuperAdmin = opts.role === 'super_admin';

  if (existingUsers.length === 0) {
    userId = generateSurrogateId('usr');
    await db.insert(users).values({
      id: userId,
      email: opts.email,
      passwordHash: hash,
      salt,
      firstName: opts.firstName!,
      lastName: opts.lastName!,
      status: 'active',
      isSuperAdmin,
    });
    console.log(`[Provisioning] Created user: ${userId}`);
  } else {
    userId = existingUsers[0]!.id;
    await db
      .update(users)
      .set({
        passwordHash: hash,
        salt,
        status: 'active',
        isSuperAdmin,
      })
      .where(eq(users.id, userId));
    console.log(`[Provisioning] Updated existing user credentials: ${userId}`);
  }

  // 2. Membership & Role Assignment (if not pure platform super_admin)
  if (!isSuperAdmin) {
    const membershipRole =
      opts.role === 'company_admin'
        ? 'company_admin'
        : opts.role === 'hr_manager'
          ? 'hr_manager'
          : opts.role === 'employee'
            ? 'employee'
            : 'user';

    const existingMem = await db
      .select()
      .from(memberships)
      .where(
        and(
          eq(memberships.tenantId, opts.tenantId!),
          eq(memberships.companyId, opts.companyId!),
          eq(memberships.userId, userId),
        ),
      );

    if (existingMem.length === 0) {
      await db.insert(memberships).values({
        id: generateSurrogateId('mem'),
        tenantId: opts.tenantId!,
        companyId: opts.companyId!,
        userId,
        role: membershipRole,
        status: 'active',
      });
      console.log(`[Provisioning] Created membership for ${opts.companyId}`);
    } else {
      await db
        .update(memberships)
        .set({ role: membershipRole, status: 'active' })
        .where(eq(memberships.id, existingMem[0]!.id));
    }

    const systemRoleId =
      opts.role === 'company_admin'
        ? 'role_sys_company_admin'
        : opts.role === 'hr_manager'
          ? 'role_sys_hr_manager'
          : opts.role === 'manager'
            ? 'role_sys_manager'
            : 'role_sys_employee';

    const existingRa = await db
      .select()
      .from(roleAssignments)
      .where(
        and(
          eq(roleAssignments.userId, userId),
          eq(roleAssignments.companyId, opts.companyId!),
          eq(roleAssignments.roleId, systemRoleId),
        ),
      );

    if (existingRa.length === 0) {
      await db.insert(roleAssignments).values({
        id: generateSurrogateId('ra'),
        userId,
        roleId: systemRoleId,
        tenantId: opts.tenantId!,
        companyId: opts.companyId!,
        status: 'active',
      });
      console.log(`[Provisioning] Assigned role ${systemRoleId}`);
    } else {
      await db
        .update(roleAssignments)
        .set({ status: 'active' })
        .where(eq(roleAssignments.id, existingRa[0]!.id));
    }
  }

  await closePool();

  console.log('\n=========================================');
  console.log('   REVIEWER ACCOUNT PROVISIONED');
  console.log('=========================================');
  console.log(`Email:    ${opts.email}`);
  console.log(`Role:     ${opts.role}`);
  console.log(`Company:  ${company.name} (${company.code})`);
  console.log('To set an individual password, run:');
  console.log(`  npm run auth:set-password -- --email ${opts.email}`);
  console.log('=========================================\n');
}

main().catch(async (err) => {
  console.error('[Provisioning Error]:', err);
  await closePool();
  process.exit(1);
});
