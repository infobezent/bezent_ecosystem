import readline from 'node:readline';
import { Writable } from 'node:stream';
import { getDb, isDatabaseConfigured, closePool } from '../src/db/connection.js';
import { users } from '../src/db/schema.js';
import { eq } from 'drizzle-orm';
import { hashPassword } from '../src/platform/auth/security.js';
import { getDeploymentEnv, env } from '../src/app/config/env.js';
import {
  parseCliArgs,
  isLocalDatabaseHost,
  validatePasswordStrength,
  verifyRemoteReviewDatabaseIdentity,
} from '../src/platform/auth/passwordManagement.js';

class MutedWritable extends Writable {
  muted = false;

  override _write(
    chunk: Buffer | string,
    encoding: BufferEncoding,
    callback: (error?: Error | null) => void,
  ) {
    if (!this.muted) {
      process.stdout.write(chunk, encoding);
    }
    callback();
  }
}

export function promptHidden(questionText: string): Promise<string> {
  const isTTY = Boolean(process.stdin.isTTY);

  if (!isTTY) {
    return new Promise((resolve) => {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal: false,
      });
      rl.question(questionText, (answer) => {
        rl.close();
        resolve(answer.trim());
      });
    });
  }

  const mutableStdout = new MutedWritable();
  const rl = readline.createInterface({
    input: process.stdin,
    output: mutableStdout,
    terminal: true,
  });

  return new Promise((resolve) => {
    process.stdout.write(questionText);
    mutableStdout.muted = true;

    rl.question('', (answer) => {
      mutableStdout.muted = false;
      process.stdout.write('\n');
      rl.close();
      resolve(answer);
    });
  });
}

export function promptInput(questionText: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(questionText, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

export async function main() {
  const deploymentEnv = getDeploymentEnv();
  if (deploymentEnv === 'production' || deploymentEnv === 'prod') {
    console.error('[Safety Blocker] Cannot run password update script in production deployment.');
    process.exit(1);
  }

  if (!isDatabaseConfigured) {
    console.error('[Error] Database is not configured.');
    process.exit(1);
  }

  const { targetEmail, isRemoteReview } = parseCliArgs(process.argv.slice(2));
  const isLocal = isLocalDatabaseHost(env.db.host, env.db.url);

  if (!isLocal && !isRemoteReview) {
    console.error('\n[Safety Blocker] Database target is not local.');
    console.error('To update credentials on the confirmed remote review database, you must pass:');
    console.error('  --remote-review');
    console.error('Operation aborted to protect external environments.\n');
    process.exit(1);
  }

  const db = getDb();

  // If remote review mode, verify database identity fail-closed
  if (!isLocal && isRemoteReview) {
    const identity = await verifyRemoteReviewDatabaseIdentity(db);
    if (!identity.verified) {
      console.error(
        `\n[Safety Blocker] Remote database failed review identity verification: ${identity.error}`,
      );
      console.error('Operation aborted.\n');
      await closePool();
      process.exit(1);
    }

    const [existingUser] = await db.select().from(users).where(eq(users.email, targetEmail));
    if (!existingUser) {
      console.error(
        `\n[Error] User with email '${targetEmail}' does not exist on remote database.`,
      );
      await closePool();
      process.exit(1);
    }

    console.log(`\n=======================================================`);
    console.log(`          REMOTE REVIEW DATABASE TARGET VERIFIED`);
    console.log(`=======================================================`);
    console.log(`Target:      Remote BEZENT Review Environment`);
    console.log(`Tenant:      tenant_demo_01 (${identity.tenantName})`);
    console.log(`Company:     comp_demo_01 (${identity.companyName})`);
    console.log(
      `Account:     ${existingUser.firstName} ${existingUser.lastName} <${existingUser.email}> (ID: ${existingUser.id})`,
    );
    console.log(`Status:      ${existingUser.status}`);
    console.log(`Safety:      Only passwordHash, salt, and updatedAt will be updated.`);
    console.log(`             Roles, memberships, and tenant isolation remain untouched.`);
    console.log(`=======================================================\n`);

    const confirmationInput = await promptInput(
      `To proceed with remote review password update, type the exact target email '${targetEmail}': `,
    );

    if (confirmationInput.trim().toLowerCase() !== targetEmail) {
      console.error('\n[Aborted] Target email confirmation did not match. Operation cancelled.\n');
      await closePool();
      process.exit(1);
    }

    console.log('\nIdentity confirmed.\n');
  } else {
    // Local mode check
    const [existingUser] = await db.select().from(users).where(eq(users.email, targetEmail));
    if (!existingUser) {
      console.error(`[Error] User with email '${targetEmail}' does not exist.`);
      await closePool();
      process.exit(1);
    }

    console.log(`\n=== BEZENT Local Password Setup ===`);
    console.log(
      `Target Account: ${existingUser.firstName} ${existingUser.lastName} <${existingUser.email}> (ID: ${existingUser.id})`,
    );
    console.log(`Environment:    ${deploymentEnv}`);
    console.log(`Safety:         Only passwordHash and salt will be modified.`);
    console.log(`                Memberships, roles, and tenant bindings will be preserved.\n`);
  }

  const [targetUser] = await db.select().from(users).where(eq(users.email, targetEmail));
  if (!targetUser) {
    console.error(`[Error] User with email '${targetEmail}' not found.`);
    await closePool();
    process.exit(1);
  }

  let password = '';
  while (true) {
    password = await promptHidden(`Enter new strong password for ${targetEmail}: `);
    const strength = validatePasswordStrength(password);
    if (!strength.valid) {
      console.error(`\n[Invalid Password] ${strength.reason}\nPlease try again.\n`);
      continue;
    }
    break;
  }

  if (process.stdin.isTTY) {
    const confirmation = await promptHidden('Confirm new password: ');
    if (password !== confirmation) {
      console.error('\n[Error] Passwords do not match.');
      await closePool();
      process.exit(1);
    }
  }

  // Hash using platform security utility (scrypt + 16-byte cryptographically secure random salt)
  const { hash, salt } = hashPassword(password);

  await db
    .update(users)
    .set({
      passwordHash: hash,
      salt,
      updatedAt: new Date(),
    })
    .where(eq(users.id, targetUser.id));

  await closePool();

  console.log('\n[Success] Password successfully updated!');
  console.log(`Account:     ${targetEmail}`);
  console.log('Credentials: Salted scrypt hash stored in database.');
  console.log('RBAC/Tenant: All memberships, roles, and permissions preserved unchanged.\n');
}

const isDirectRun =
  process.argv[1]?.includes('set-user-password') && process.env.NODE_ENV !== 'test';

if (isDirectRun) {
  main().catch(async (err) => {
    console.error('[Error] Failed to set password:', err instanceof Error ? err.message : err);
    await closePool();
    process.exit(1);
  });
}
