import readline from 'node:readline';
import { Writable } from 'node:stream';
import { getDb, isDatabaseConfigured, closePool } from '../src/db/connection.js';
import { users } from '../src/db/schema.js';
import { eq } from 'drizzle-orm';
import { hashPassword } from '../src/platform/auth/security.js';
import { getDeploymentEnv, env } from '../src/app/config/env.js';

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

function promptHidden(questionText: string): Promise<string> {
  const isTTY = Boolean(process.stdin.isTTY);

  if (!isTTY) {
    // Non-interactive / piped input
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

function parseEmailArg(): string {
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--email' && args[i + 1]) {
      return args[i + 1].trim().toLowerCase();
    }
  }
  return 'hr@bezent.com';
}

async function main() {
  const deploymentEnv = getDeploymentEnv();
  if (deploymentEnv === 'production' || deploymentEnv === 'prod') {
    console.error('[Safety Blocker] Cannot run password update script in production deployment.');
    process.exit(1);
  }

  // Confirm local database isolation
  const dbHost = (env.db.host || '').toLowerCase();
  const isLocalHost = dbHost === 'localhost' || dbHost === '127.0.0.1' || dbHost === '';
  if (!isLocalHost) {
    console.error('[Safety Blocker] Database host is not local. Operation aborted to protect external environments.');
    process.exit(1);
  }

  if (!isDatabaseConfigured) {
    console.error('[Error] Database is not configured.');
    process.exit(1);
  }

  const targetEmail = parseEmailArg();
  const db = getDb();

  const [existingUser] = await db.select().from(users).where(eq(users.email, targetEmail));
  if (!existingUser) {
    console.error(`[Error] User with email '${targetEmail}' does not exist.`);
    console.error('This script only updates passwords for existing accounts to prevent duplicate or orphaned users.');
    await closePool();
    process.exit(1);
  }

  console.log(`\n=== BEZENT Local Password Setup ===`);
  console.log(`Target Account: ${existingUser.firstName} ${existingUser.lastName} <${existingUser.email}> (ID: ${existingUser.id})`);
  console.log(`Environment:    ${deploymentEnv} (Local MySQL: ${env.db.host}:${env.db.port} / ${env.db.name})`);
  console.log(`Safety:         Only passwordHash and salt will be modified.`);
  console.log(`                Memberships, roles, and tenant bindings will be preserved.\n`);

  const password = await promptHidden(`Enter new password for ${targetEmail}: `);

  if (!password || password.length < 8) {
    console.error('\n[Error] Password must be at least 8 characters long.');
    await closePool();
    process.exit(1);
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
    .where(eq(users.id, existingUser.id));

  await closePool();

  console.log('\n[Success] Password successfully updated!');
  console.log(`Account:     ${targetEmail}`);
  console.log('Credentials: Salted scrypt hash stored in database.');
  console.log('RBAC/Tenant: All memberships, roles, and permissions preserved unchanged.\n');
}

main().catch(async (err) => {
  console.error('[Error] Failed to set password:', err instanceof Error ? err.message : err);
  await closePool();
  process.exit(1);
});
