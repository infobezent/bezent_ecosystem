import { eq, and, desc } from 'drizzle-orm';
import { getDb } from '../../../db/connection.js';
import { memberships, users, companies, tenants } from '../../../db/schema.js';
import type { CompanyAdminAssignment } from '../types/companyAdmin.types.js';
import { generateSurrogateId } from '../../auth/security.js';
import type { DbExecutor } from '../../access/repository/access.repository.js';

export class CompanyAdminRepository {
  async list(tenantId?: string, companyId?: string): Promise<CompanyAdminAssignment[]> {
    const db = getDb();
    const conditions = [eq(memberships.role, 'company_admin'), eq(memberships.status, 'active')];
    if (tenantId) conditions.push(eq(memberships.tenantId, tenantId));
    if (companyId) conditions.push(eq(memberships.companyId, companyId));

    const rows = await db
      .select({
        membershipId: memberships.id,
        userId: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        phone: users.phone,
        tenantId: memberships.tenantId,
        tenantName: tenants.name,
        companyId: memberships.companyId,
        companyName: companies.name,
        role: memberships.role,
        status: memberships.status,
        assignedAt: memberships.createdAt,
      })
      .from(memberships)
      .innerJoin(users, eq(memberships.userId, users.id))
      .innerJoin(companies, eq(memberships.companyId, companies.id))
      .innerJoin(tenants, eq(memberships.tenantId, tenants.id))
      .where(and(...conditions))
      .orderBy(desc(memberships.createdAt));

    return rows.map((r) => ({
      membershipId: r.membershipId,
      userId: r.userId,
      email: r.email,
      firstName: r.firstName,
      lastName: r.lastName,
      phone: r.phone,
      tenantId: r.tenantId,
      tenantName: r.tenantName,
      companyId: r.companyId,
      companyName: r.companyName,
      role: r.role,
      status: r.status,
      assignedAt: r.assignedAt.toISOString(),
    }));
  }

  async findMembership(
    tenantId: string,
    companyId: string,
    userId: string,
    db: DbExecutor = getDb(),
  ) {
    const [row] = await db
      .select()
      .from(memberships)
      .where(
        and(
          eq(memberships.tenantId, tenantId),
          eq(memberships.companyId, companyId),
          eq(memberships.userId, userId),
          eq(memberships.role, 'company_admin'),
        ),
      );
    return row ?? null;
  }

  async findMembershipById(membershipId: string) {
    const db = getDb();
    const [row] = await db.select().from(memberships).where(eq(memberships.id, membershipId));
    return row ?? null;
  }

  async createMembership(
    tenantId: string,
    companyId: string,
    userId: string,
    db: DbExecutor = getDb(),
  ): Promise<string> {
    const existing = await this.findMembership(tenantId, companyId, userId, db);
    if (existing) {
      if (existing.status !== 'active') {
        await db
          .update(memberships)
          .set({ status: 'active' })
          .where(eq(memberships.id, existing.id));
      }
      return existing.id;
    }

    const id = generateSurrogateId('mem');
    await db.insert(memberships).values({
      id,
      tenantId,
      companyId,
      userId,
      role: 'company_admin',
      status: 'active',
    });
    return id;
  }

  async revokeMembership(membershipId: string, db: DbExecutor = getDb()): Promise<void> {
    await db.update(memberships).set({ status: 'revoked' }).where(eq(memberships.id, membershipId));
  }
}

export const companyAdminRepository = new CompanyAdminRepository();
