import { eq, sql } from 'drizzle-orm';
import { getDb } from '../../db/connection.js';
import { tenants, companies } from '../../db/schema.js';

export const DISALLOWED_PREVIOUS_PASSWORDS: readonly string[] = Object.freeze(['Bezent@HR2026!']);

export interface CliArgs {
  targetEmail: string;
  isRemoteReview: boolean;
}

export function parseCliArgs(args: string[]): CliArgs {
  let targetEmail = 'hr@bezent.com';
  let isRemoteReview = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--email' && args[i + 1]) {
      const nextArg = args[++i];
      if (nextArg) {
        targetEmail = nextArg.trim().toLowerCase();
      }
    } else if (arg === '--remote-review') {
      isRemoteReview = true;
    }
  }

  return { targetEmail, isRemoteReview };
}

export function isLocalDatabaseHost(host?: string, url?: string): boolean {
  let resolvedHost = (host || '').toLowerCase().trim();
  if (url) {
    try {
      const parsed = new URL(url);
      resolvedHost = parsed.hostname.toLowerCase().trim();
    } catch {
      // ignore parse failure
    }
  }
  return (
    resolvedHost === 'localhost' ||
    resolvedHost === '127.0.0.1' ||
    resolvedHost === '::1' ||
    resolvedHost === ''
  );
}

export function validatePasswordStrength(
  password: string,
  disallowedPasswords: readonly string[] = DISALLOWED_PREVIOUS_PASSWORDS,
): { valid: boolean; reason?: string } {
  if (!password || password.length < 10) {
    return { valid: false, reason: 'Password must be at least 10 characters long.' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, reason: 'Password must contain at least one uppercase letter.' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, reason: 'Password must contain at least one lowercase letter.' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, reason: 'Password must contain at least one number.' };
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return { valid: false, reason: 'Password must contain at least one special character.' };
  }
  for (const disallowed of disallowedPasswords) {
    if (password === disallowed) {
      return {
        valid: false,
        reason:
          'This password was previously exposed and cannot be reused. Please choose a new unique password.',
      };
    }
  }
  return { valid: true };
}

export async function verifyRemoteReviewDatabaseIdentity(
  db: ReturnType<typeof getDb>,
): Promise<{ verified: boolean; tenantName?: string; companyName?: string; error?: string }> {
  try {
    const [demoTenant] = await db
      .select({ id: tenants.id, name: tenants.name, status: tenants.status })
      .from(tenants)
      .where(eq(tenants.id, 'tenant_demo_01'));

    if (!demoTenant || demoTenant.status !== 'active') {
      return {
        verified: false,
        error: "Missing or inactive required review tenant 'tenant_demo_01'.",
      };
    }

    const [demoCompany] = await db
      .select({ id: companies.id, name: companies.name, status: companies.status })
      .from(companies)
      .where(eq(companies.id, 'comp_demo_01'));

    if (!demoCompany || demoCompany.status !== 'active') {
      return {
        verified: false,
        error: "Missing or inactive required review company 'comp_demo_01'.",
      };
    }

    // Fail closed: Ensure no non-demo tenants exist
    const foreignTenants = await db
      .select({ id: tenants.id })
      .from(tenants)
      .where(sql`${tenants.id} NOT IN ('tenant_demo_01')`);

    if (foreignTenants.length > 0) {
      return {
        verified: false,
        error: `Found ${foreignTenants.length} non-demo tenant(s). Remote database is not an isolated review database.`,
      };
    }

    return {
      verified: true,
      tenantName: demoTenant.name,
      companyName: demoCompany.name,
    };
  } catch (err) {
    return {
      verified: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
