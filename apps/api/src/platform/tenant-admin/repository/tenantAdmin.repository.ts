import { eq, and, count } from 'drizzle-orm';
import { getDb } from '../../../db/connection.js';
import { tenantAdmins, tenants, users, type NewTenantAdmin } from '../../../db/schema.js';
import type { DbExecutor } from '../../access/repository/access.repository.js';
import type { TenantAdminRecord, TenantAdminStatus } from '../types/tenantAdmin.types.js';

export class TenantAdminRepository {
  async findById(id: string, db: DbExecutor = getDb()): Promise<TenantAdminRecord | null> {
    const [row] = await db
      .select({
        id: tenantAdmins.id,
        tenantId: tenantAdmins.tenantId,
        tenantName: tenants.name,
        userId: tenantAdmins.userId,
        userEmail: users.email,
        userFirstName: users.firstName,
        userLastName: users.lastName,
        status: tenantAdmins.status,
        createdAt: tenantAdmins.createdAt,
        updatedAt: tenantAdmins.updatedAt,
      })
      .from(tenantAdmins)
      .innerJoin(tenants, eq(tenantAdmins.tenantId, tenants.id))
      .innerJoin(users, eq(tenantAdmins.userId, users.id))
      .where(eq(tenantAdmins.id, id));

    return row ? (row as TenantAdminRecord) : null;
  }

  async findByTenantAndUser(
    tenantId: string,
    userId: string,
    db: DbExecutor = getDb(),
  ): Promise<TenantAdminRecord | null> {
    const [row] = await db
      .select({
        id: tenantAdmins.id,
        tenantId: tenantAdmins.tenantId,
        tenantName: tenants.name,
        userId: tenantAdmins.userId,
        userEmail: users.email,
        userFirstName: users.firstName,
        userLastName: users.lastName,
        status: tenantAdmins.status,
        createdAt: tenantAdmins.createdAt,
        updatedAt: tenantAdmins.updatedAt,
      })
      .from(tenantAdmins)
      .innerJoin(tenants, eq(tenantAdmins.tenantId, tenants.id))
      .innerJoin(users, eq(tenantAdmins.userId, users.id))
      .where(and(eq(tenantAdmins.tenantId, tenantId), eq(tenantAdmins.userId, userId)));

    return row ? (row as TenantAdminRecord) : null;
  }

  async findActiveByTenantAndUser(
    tenantId: string,
    userId: string,
    db: DbExecutor = getDb(),
  ): Promise<TenantAdminRecord | null> {
    const [row] = await db
      .select({
        id: tenantAdmins.id,
        tenantId: tenantAdmins.tenantId,
        tenantName: tenants.name,
        userId: tenantAdmins.userId,
        userEmail: users.email,
        userFirstName: users.firstName,
        userLastName: users.lastName,
        status: tenantAdmins.status,
        createdAt: tenantAdmins.createdAt,
        updatedAt: tenantAdmins.updatedAt,
      })
      .from(tenantAdmins)
      .innerJoin(tenants, eq(tenantAdmins.tenantId, tenants.id))
      .innerJoin(users, eq(tenantAdmins.userId, users.id))
      .where(
        and(
          eq(tenantAdmins.tenantId, tenantId),
          eq(tenantAdmins.userId, userId),
          eq(tenantAdmins.status, 'active'),
        ),
      );

    return row ? (row as TenantAdminRecord) : null;
  }

  async hasActiveTenantAdmin(
    tenantId: string,
    userId: string,
    db: DbExecutor = getDb(),
  ): Promise<boolean> {
    const [row] = await db
      .select({ id: tenantAdmins.id })
      .from(tenantAdmins)
      .where(
        and(
          eq(tenantAdmins.tenantId, tenantId),
          eq(tenantAdmins.userId, userId),
          eq(tenantAdmins.status, 'active'),
        ),
      );

    return Boolean(row);
  }

  async listByTenant(tenantId: string, db: DbExecutor = getDb()): Promise<TenantAdminRecord[]> {
    const rows = await db
      .select({
        id: tenantAdmins.id,
        tenantId: tenantAdmins.tenantId,
        tenantName: tenants.name,
        userId: tenantAdmins.userId,
        userEmail: users.email,
        userFirstName: users.firstName,
        userLastName: users.lastName,
        status: tenantAdmins.status,
        createdAt: tenantAdmins.createdAt,
        updatedAt: tenantAdmins.updatedAt,
      })
      .from(tenantAdmins)
      .innerJoin(tenants, eq(tenantAdmins.tenantId, tenants.id))
      .innerJoin(users, eq(tenantAdmins.userId, users.id))
      .where(eq(tenantAdmins.tenantId, tenantId));

    return rows as TenantAdminRecord[];
  }

  async listActiveByTenant(tenantId: string, db: DbExecutor = getDb()): Promise<TenantAdminRecord[]> {
    const rows = await db
      .select({
        id: tenantAdmins.id,
        tenantId: tenantAdmins.tenantId,
        tenantName: tenants.name,
        userId: tenantAdmins.userId,
        userEmail: users.email,
        userFirstName: users.firstName,
        userLastName: users.lastName,
        status: tenantAdmins.status,
        createdAt: tenantAdmins.createdAt,
        updatedAt: tenantAdmins.updatedAt,
      })
      .from(tenantAdmins)
      .innerJoin(tenants, eq(tenantAdmins.tenantId, tenants.id))
      .innerJoin(users, eq(tenantAdmins.userId, users.id))
      .where(and(eq(tenantAdmins.tenantId, tenantId), eq(tenantAdmins.status, 'active')));

    return rows as TenantAdminRecord[];
  }

  async listActiveByUser(userId: string, db: DbExecutor = getDb()): Promise<TenantAdminRecord[]> {
    const rows = await db
      .select({
        id: tenantAdmins.id,
        tenantId: tenantAdmins.tenantId,
        tenantName: tenants.name,
        userId: tenantAdmins.userId,
        userEmail: users.email,
        userFirstName: users.firstName,
        userLastName: users.lastName,
        status: tenantAdmins.status,
        createdAt: tenantAdmins.createdAt,
        updatedAt: tenantAdmins.updatedAt,
      })
      .from(tenantAdmins)
      .innerJoin(tenants, eq(tenantAdmins.tenantId, tenants.id))
      .innerJoin(users, eq(tenantAdmins.userId, users.id))
      .where(and(eq(tenantAdmins.userId, userId), eq(tenantAdmins.status, 'active')));

    return rows as TenantAdminRecord[];
  }

  async countActiveByTenant(tenantId: string, db: DbExecutor = getDb()): Promise<number> {
    const [row] = await db
      .select({ total: count() })
      .from(tenantAdmins)
      .where(and(eq(tenantAdmins.tenantId, tenantId), eq(tenantAdmins.status, 'active')));

    return row ? Number(row.total) : 0;
  }

  async hasAnyActiveTenantAdmin(tenantId: string, db: DbExecutor = getDb()): Promise<boolean> {
    const active = await this.countActiveByTenant(tenantId, db);
    return active > 0;
  }

  async listAll(
    filter?: { tenantId?: string; status?: TenantAdminStatus },
    db: DbExecutor = getDb(),
  ): Promise<TenantAdminRecord[]> {
    const query = db
      .select({
        id: tenantAdmins.id,
        tenantId: tenantAdmins.tenantId,
        tenantName: tenants.name,
        userId: tenantAdmins.userId,
        userEmail: users.email,
        userFirstName: users.firstName,
        userLastName: users.lastName,
        status: tenantAdmins.status,
        createdAt: tenantAdmins.createdAt,
        updatedAt: tenantAdmins.updatedAt,
      })
      .from(tenantAdmins)
      .innerJoin(tenants, eq(tenantAdmins.tenantId, tenants.id))
      .innerJoin(users, eq(tenantAdmins.userId, users.id));

    const conditions = [];
    if (filter?.tenantId) {
      conditions.push(eq(tenantAdmins.tenantId, filter.tenantId));
    }
    if (filter?.status) {
      conditions.push(eq(tenantAdmins.status, filter.status));
    }

    const rows = conditions.length > 0 ? await query.where(and(...conditions)) : await query;
    return rows as TenantAdminRecord[];
  }

  async create(data: NewTenantAdmin, db: DbExecutor = getDb()): Promise<TenantAdminRecord> {
    await db.insert(tenantAdmins).values(data);
    const created = await this.findById(data.id, db);
    if (!created) throw new Error('Failed to create tenant admin record');
    return created;
  }

  async updateStatus(
    id: string,
    status: TenantAdminStatus,
    db: DbExecutor = getDb(),
  ): Promise<TenantAdminRecord> {
    await db.update(tenantAdmins).set({ status }).where(eq(tenantAdmins.id, id));
    const updated = await this.findById(id, db);
    if (!updated) throw new Error('Failed to update tenant admin record');
    return updated;
  }
}

export const tenantAdminRepository = new TenantAdminRepository();
