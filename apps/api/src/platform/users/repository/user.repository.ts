import { eq, or, like, and, desc, inArray } from 'drizzle-orm';
import { getDb } from '../../../db/connection.js';
import { users, memberships, companies, tenants } from '../../../db/schema.js';
import type {
  CreateUserDto,
  PlatformUserRecord,
  UserAccountStatus,
  UserFilter,
  UserMembershipRecord,
} from '../types/user.types.js';
import { createUnusableCredential, generateSurrogateId } from '../../auth/security.js';

export class PlatformUserRepository {
  async findById(id: string): Promise<PlatformUserRecord | null> {
    const db = getDb();
    const [u] = await db.select().from(users).where(eq(users.id, id));
    if (!u) return null;

    const membershipRows = await db
      .select({
        id: memberships.id,
        tenantId: memberships.tenantId,
        tenantName: tenants.name,
        companyId: memberships.companyId,
        companyName: companies.name,
        role: memberships.role,
        status: memberships.status,
      })
      .from(memberships)
      .leftJoin(companies, eq(memberships.companyId, companies.id))
      .leftJoin(tenants, eq(memberships.tenantId, tenants.id))
      .where(eq(memberships.userId, id));

    return {
      id: u.id,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      phone: u.phone,
      status: u.status as UserAccountStatus,
      isSuperAdmin: u.isSuperAdmin,
      lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : null,
      createdAt: u.createdAt.toISOString(),
      updatedAt: u.updatedAt.toISOString(),
      memberships: membershipRows.map((m) => ({
        id: m.id,
        tenantId: m.tenantId,
        tenantName: m.tenantName ?? undefined,
        companyId: m.companyId,
        companyName: m.companyName ?? undefined,
        role: m.role,
        status: m.status,
      })),
    };
  }

  async findByEmail(email: string): Promise<PlatformUserRecord | null> {
    const db = getDb();
    const [u] = await db.select().from(users).where(eq(users.email, email.toLowerCase().trim()));
    if (!u) return null;
    return this.findById(u.id);
  }

  /** Creates a passwordless identity (ADR-018): the user signs in with Email OTP. */
  async create(dto: CreateUserDto): Promise<PlatformUserRecord> {
    const db = getDb();
    const id = generateSurrogateId('usr');
    const { hash, salt } = createUnusableCredential();

    await db.insert(users).values({
      id,
      email: dto.email.toLowerCase().trim(),
      passwordHash: hash,
      salt,
      firstName: dto.firstName.trim(),
      lastName: dto.lastName.trim(),
      phone: dto.phone ? dto.phone.trim() : null,
      status: dto.status ?? 'active',
      isSuperAdmin: dto.isSuperAdmin ?? false,
    });

    const created = await this.findById(id);
    if (!created) throw new Error('Failed to create user');
    return created;
  }

  async updateStatus(id: string, status: UserAccountStatus): Promise<PlatformUserRecord> {
    const db = getDb();
    await db.update(users).set({ status }).where(eq(users.id, id));
    const updated = await this.findById(id);
    if (!updated) throw new Error('User not found');
    return updated;
  }

  async updateRole(id: string, isSuperAdmin: boolean): Promise<PlatformUserRecord> {
    const db = getDb();
    await db.update(users).set({ isSuperAdmin }).where(eq(users.id, id));
    const updated = await this.findById(id);
    if (!updated) throw new Error('User not found');
    return updated;
  }

  async list(filter: UserFilter): Promise<{ items: PlatformUserRecord[]; total: number }> {
    const db = getDb();
    const page = Math.max(1, filter.page ?? 1);
    const limit = Math.min(100, Math.max(1, filter.limit ?? 20));
    const offset = (page - 1) * limit;

    let targetUserIds: string[] | undefined;

    // Filter by tenantId or companyId through memberships if specified
    if (filter.tenantId || filter.companyId) {
      const conds = [];
      if (filter.tenantId) conds.push(eq(memberships.tenantId, filter.tenantId));
      if (filter.companyId) conds.push(eq(memberships.companyId, filter.companyId));
      const mRows = await db
        .select({ userId: memberships.userId })
        .from(memberships)
        .where(and(...conds));
      targetUserIds = Array.from(new Set(mRows.map((r) => r.userId)));
      if (targetUserIds.length === 0) {
        return { items: [], total: 0 };
      }
    }

    const conditions = [];
    if (targetUserIds) {
      conditions.push(inArray(users.id, targetUserIds));
    }
    if (filter.status) {
      conditions.push(eq(users.status, filter.status));
    }
    if (filter.search) {
      const s = `%${filter.search.trim()}%`;
      conditions.push(
        or(
          like(users.email, s),
          like(users.firstName, s),
          like(users.lastName, s),
          like(users.id, s),
        ),
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        phone: users.phone,
        status: users.status,
        isSuperAdmin: users.isSuperAdmin,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(whereClause)
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset);

    const countRows = await db.select({ id: users.id }).from(users).where(whereClause);

    // Fetch memberships for this page's users
    const userIds = rows.map((u) => u.id);
    const membershipMap = new Map<string, UserMembershipRecord[]>();

    if (userIds.length > 0) {
      const allMemberships = await db
        .select({
          id: memberships.id,
          userId: memberships.userId,
          tenantId: memberships.tenantId,
          tenantName: tenants.name,
          companyId: memberships.companyId,
          companyName: companies.name,
          role: memberships.role,
          status: memberships.status,
        })
        .from(memberships)
        .leftJoin(companies, eq(memberships.companyId, companies.id))
        .leftJoin(tenants, eq(memberships.tenantId, tenants.id))
        .where(inArray(memberships.userId, userIds));

      for (const m of allMemberships) {
        const list = membershipMap.get(m.userId) ?? [];
        list.push({
          id: m.id,
          tenantId: m.tenantId,
          tenantName: m.tenantName ?? undefined,
          companyId: m.companyId,
          companyName: m.companyName ?? undefined,
          role: m.role,
          status: m.status,
        });
        membershipMap.set(m.userId, list);
      }
    }

    return {
      items: rows.map((u) => ({
        id: u.id,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        phone: u.phone,
        status: u.status as UserAccountStatus,
        isSuperAdmin: u.isSuperAdmin,
        lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : null,
        createdAt: u.createdAt.toISOString(),
        updatedAt: u.updatedAt.toISOString(),
        memberships: membershipMap.get(u.id) ?? [],
      })),
      total: countRows.length,
    };
  }

  async getCounts() {
    const db = getDb();
    const rows = await db.select({ status: users.status }).from(users);
    const total = rows.length;
    const active = rows.filter((u) => u.status === 'active').length;
    const suspended = rows.filter((u) => u.status === 'suspended').length;
    return { total, active, suspended };
  }
}

export const platformUserRepository = new PlatformUserRepository();
