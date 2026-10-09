import { eq, and, count, or, inArray, desc, like } from 'drizzle-orm';
import { getDb } from '../../../db/connection.js';
import {
  tenantAdmins,
  tenants,
  users,
  memberships,
  companies,
  roles,
  roleAssignments,
  invitations,
  type NewTenantAdmin,
  type User,
} from '../../../db/schema.js';
import type { DbExecutor } from '../../../platform/access/repository/access.repository.js';
import type {
  TenantAdminRecord,
  TenantAdminStatus,
  TenantMemberListFilter,
  TenantMemberRecord,
  TenantMemberCompanyAccess,
  CompanyAccessUserItem,
  AvailableTenantUserItem,
  CompanyAccessRole,
} from '../types/tenantAdmin.types.js';

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

  async listActiveByTenant(
    tenantId: string,
    db: DbExecutor = getDb(),
  ): Promise<TenantAdminRecord[]> {
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

  async findPendingInvitationsByTenantAndEmail(
    tenantId: string,
    email: string,
    db: DbExecutor = getDb(),
  ) {
    return db
      .select()
      .from(invitations)
      .where(
        and(
          eq(invitations.tenantId, tenantId),
          eq(invitations.email, email.toLowerCase().trim()),
          eq(invitations.status, 'pending'),
        ),
      );
  }

  async listTenantMembers(
    tenantId: string,
    filter: TenantMemberListFilter = {},
    db: DbExecutor = getDb(),
  ): Promise<{ items: TenantMemberRecord[]; total: number }> {
    // 1. Candidate users from memberships in this tenant
    const membershipRows = await db
      .select({ userId: memberships.userId, companyId: memberships.companyId })
      .from(memberships)
      .where(and(eq(memberships.tenantId, tenantId), eq(memberships.status, 'active')));

    // 2. Candidate users from tenant_admins in this tenant
    const tenantAdminRows = await db
      .select({ userId: tenantAdmins.userId, status: tenantAdmins.status })
      .from(tenantAdmins)
      .where(and(eq(tenantAdmins.tenantId, tenantId), eq(tenantAdmins.status, 'active')));

    const activeTenantAdminUserIds = new Set(tenantAdminRows.map((r) => r.userId));

    let candidateUserIds = new Set<string>();

    if (filter.authority === 'tenant_admin') {
      candidateUserIds = new Set(activeTenantAdminUserIds);
    } else if (filter.authority === 'standard') {
      for (const m of membershipRows) {
        if (!activeTenantAdminUserIds.has(m.userId)) {
          candidateUserIds.add(m.userId);
        }
      }
    } else {
      for (const r of tenantAdminRows) candidateUserIds.add(r.userId);
      for (const m of membershipRows) candidateUserIds.add(m.userId);
    }

    if (filter.companyId) {
      const allowedInCompany = new Set(
        membershipRows.filter((m) => m.companyId === filter.companyId).map((m) => m.userId),
      );
      candidateUserIds = new Set([...candidateUserIds].filter((id) => allowedInCompany.has(id)));
    }

    const userIdsArray = Array.from(candidateUserIds);
    if (userIdsArray.length === 0) {
      return { items: [], total: 0 };
    }

    const page = Math.max(1, filter.page ?? 1);
    const limit = Math.min(100, Math.max(1, filter.limit ?? 20));
    const offset = (page - 1) * limit;

    const conditions = [inArray(users.id, userIdsArray)];
    if (filter.status) {
      conditions.push(eq(users.status, filter.status as User['status']));
    }
    if (filter.search) {
      const s = `%${filter.search.trim()}%`;
      conditions.push(or(like(users.email, s), like(users.firstName, s), like(users.lastName, s))!);
    }

    const whereClause = and(...conditions);

    const userRows = await db
      .select()
      .from(users)
      .where(whereClause)
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset);

    const totalCountRows = await db.select({ id: users.id }).from(users).where(whereClause);
    const total = totalCountRows.length;

    const pageUserIds = userRows.map((u) => u.id);
    if (pageUserIds.length === 0) {
      return { items: [], total };
    }

    const pageTenantAdminRows = await db
      .select()
      .from(tenantAdmins)
      .where(and(eq(tenantAdmins.tenantId, tenantId), inArray(tenantAdmins.userId, pageUserIds)));
    const taMap = new Map<string, typeof tenantAdmins.$inferSelect>();
    for (const ta of pageTenantAdminRows) {
      if (ta.status === 'active') taMap.set(ta.userId, ta);
    }

    const pageMembershipRows = await db
      .select({
        id: memberships.id,
        userId: memberships.userId,
        companyId: memberships.companyId,
        companyName: companies.name,
        companyCode: companies.code,
        status: memberships.status,
      })
      .from(memberships)
      .innerJoin(companies, eq(memberships.companyId, companies.id))
      .where(
        and(
          eq(memberships.tenantId, tenantId),
          inArray(memberships.userId, pageUserIds),
          eq(memberships.status, 'active'),
        ),
      );

    const pageRoleRows = await db
      .select({
        userId: roleAssignments.userId,
        companyId: roleAssignments.companyId,
        roleId: roles.id,
        roleCode: roles.code,
        roleName: roles.name,
        moduleCode: roles.moduleCode,
        isSystem: roles.isSystem,
      })
      .from(roleAssignments)
      .innerJoin(roles, eq(roleAssignments.roleId, roles.id))
      .where(
        and(
          eq(roleAssignments.tenantId, tenantId),
          inArray(roleAssignments.userId, pageUserIds),
          eq(roleAssignments.status, 'active'),
        ),
      );

    const userEmails = userRows.map((u) => u.email.toLowerCase().trim());
    const pendingInvites = await db
      .select({
        id: invitations.id,
        email: invitations.email,
        companyId: invitations.companyId,
        companyName: companies.name,
        role: invitations.role,
        status: invitations.status,
        expiresAt: invitations.expiresAt,
        createdAt: invitations.createdAt,
      })
      .from(invitations)
      .leftJoin(companies, eq(invitations.companyId, companies.id))
      .where(
        and(
          eq(invitations.tenantId, tenantId),
          inArray(invitations.email, userEmails),
          eq(invitations.status, 'pending'),
        ),
      );

    const items: TenantMemberRecord[] = userRows.map((u) => {
      const activeTa = taMap.get(u.id);
      const isTa = Boolean(activeTa);
      const userMemberships = pageMembershipRows.filter((m) => m.userId === u.id);

      const companiesAccess: TenantMemberCompanyAccess[] = userMemberships.map((m) => {
        const userCompanyRoles = pageRoleRows.filter(
          (r) => r.userId === u.id && r.companyId === m.companyId,
        );
        return {
          companyId: m.companyId,
          companyName: m.companyName,
          companyCode: m.companyCode,
          status: m.status,
          roles: userCompanyRoles.map((r) => ({
            roleId: r.roleId,
            roleCode: r.roleCode,
            roleName: r.roleName,
            moduleCode: r.moduleCode,
            isSystem: r.isSystem,
          })),
        };
      });

      const userInvites = pendingInvites.filter(
        (inv) => inv.email.toLowerCase() === u.email.toLowerCase(),
      );

      return {
        id: u.id,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        phone: u.phone,
        status: u.status,
        isSuperAdmin: u.isSuperAdmin,
        tenantAuthority: isTa ? 'tenant_admin' : 'standard',
        tenantAdminId: activeTa?.id ?? null,
        companies: companiesAccess,
        pendingInvitations: userInvites.map((inv) => ({
          id: inv.id,
          companyId: inv.companyId,
          companyName: inv.companyName ?? undefined,
          role: inv.role,
          status: inv.status,
          expiresAt: inv.expiresAt.toISOString(),
          createdAt: inv.createdAt.toISOString(),
        })),
        createdAt: u.createdAt.toISOString(),
        lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : null,
      };
    });

    return { items, total };
  }

  async getTenantMemberDetails(
    tenantId: string,
    userId: string,
    db: DbExecutor = getDb(),
  ): Promise<TenantMemberRecord | null> {
    const res = await this.listTenantMembers(tenantId, {}, db);
    const found = res.items.find((m) => m.id === userId);
    return found ?? null;
  }

  /* ── Company Access V1 Methods ──────────────────────────────────────── */

  async listCompanyMembersAndInvitations(
    tenantId: string,
    companyId: string,
    filter?: { search?: string; role?: string; status?: string },
    db: DbExecutor = getDb(),
  ): Promise<CompanyAccessUserItem[]> {
    // 1. Fetch all memberships for this company
    const memberRows = await db
      .select({
        membershipId: memberships.id,
        userId: memberships.userId,
        membershipRole: memberships.role,
        membershipStatus: memberships.status,
        membershipCreatedAt: memberships.createdAt,
        userEmail: users.email,
        userFirstName: users.firstName,
        userLastName: users.lastName,
      })
      .from(memberships)
      .innerJoin(users, eq(memberships.userId, users.id))
      .where(and(eq(memberships.tenantId, tenantId), eq(memberships.companyId, companyId)))
      .orderBy(desc(memberships.createdAt));

    // Fetch active roleAssignments for these users in this company to check if company_admin
    const userIds = memberRows.map((m) => m.userId);
    let companyAdminUserIds = new Set<string>();
    if (userIds.length > 0) {
      const adminRoleAssignments = await db
        .select({ userId: roleAssignments.userId })
        .from(roleAssignments)
        .innerJoin(roles, eq(roleAssignments.roleId, roles.id))
        .where(
          and(
            eq(roleAssignments.tenantId, tenantId),
            eq(roleAssignments.companyId, companyId),
            inArray(roleAssignments.userId, userIds),
            eq(roleAssignments.status, 'active'),
            eq(roles.code, 'company_admin'),
          ),
        );
      companyAdminUserIds = new Set(adminRoleAssignments.map((r) => r.userId));
    }

    // 2. Fetch invitations for this company
    const invitationRows = await db
      .select({
        id: invitations.id,
        email: invitations.email,
        role: invitations.role,
        status: invitations.status,
        expiresAt: invitations.expiresAt,
        createdAt: invitations.createdAt,
      })
      .from(invitations)
      .where(and(eq(invitations.tenantId, tenantId), eq(invitations.companyId, companyId)))
      .orderBy(desc(invitations.createdAt));

    // Combine into unified items
    const items: CompanyAccessUserItem[] = [];

    // Map memberships
    for (const row of memberRows) {
      const isCompAdmin =
        row.membershipRole === 'company_admin' || companyAdminUserIds.has(row.userId);
      const role: CompanyAccessRole = isCompAdmin ? 'company_admin' : 'member';
      const roleLabel = isCompAdmin ? 'Company Admin' : 'Member';
      const status = row.membershipStatus as 'active' | 'inactive' | 'revoked';
      const statusLabel =
        status === 'active' ? 'Active' : status === 'inactive' ? 'Inactive' : 'Revoked';

      items.push({
        userId: row.userId,
        email: row.userEmail,
        firstName: row.userFirstName,
        lastName: row.userLastName,
        fullName: `${row.userFirstName} ${row.userLastName}`.trim(),
        role,
        roleLabel,
        status,
        statusLabel,
        joinedAt: row.membershipCreatedAt.toISOString(),
        isInvitation: false,
      });
    }

    // Map invitations (pending invitations)
    for (const inv of invitationRows) {
      if (inv.status === 'pending') {
        const isCompAdmin = inv.role === 'company_admin';
        const role: CompanyAccessRole = isCompAdmin ? 'company_admin' : 'member';
        const roleLabel = isCompAdmin ? 'Company Admin' : 'Member';

        items.push({
          invitationId: inv.id,
          email: inv.email,
          firstName: '',
          lastName: '',
          fullName: inv.email,
          role,
          roleLabel,
          status: 'pending_invitation',
          statusLabel: 'Pending Invitation',
          invitedAt: inv.createdAt.toISOString(),
          expiresAt: inv.expiresAt.toISOString(),
          isInvitation: true,
        });
      }
    }

    // Apply filtering in-memory
    let filtered = items;
    if (filter?.search) {
      const q = filter.search.toLowerCase().trim();
      filtered = filtered.filter(
        (i) =>
          i.fullName.toLowerCase().includes(q) ||
          i.email.toLowerCase().includes(q) ||
          i.roleLabel.toLowerCase().includes(q),
      );
    }
    if (filter?.role && filter.role !== 'all') {
      filtered = filtered.filter((i) => i.role === filter.role);
    }
    if (filter?.status && filter.status !== 'all') {
      filtered = filtered.filter((i) => i.status === filter.status);
    }

    return filtered;
  }

  async listAvailableTenantUsersForCompany(
    tenantId: string,
    companyId: string,
    search?: string,
    db: DbExecutor = getDb(),
  ): Promise<AvailableTenantUserItem[]> {
    // 1. Existing company member user IDs
    const existingMembers = await db
      .select({ userId: memberships.userId })
      .from(memberships)
      .where(
        and(
          eq(memberships.tenantId, tenantId),
          eq(memberships.companyId, companyId),
          inArray(memberships.status, ['active', 'inactive']),
        ),
      );
    const existingMemberUserIds = new Set(existingMembers.map((m) => m.userId));

    // 2. All tenant user candidates from memberships in tenant and tenant_admins
    const tenantMemberships = await db
      .select({ userId: memberships.userId })
      .from(memberships)
      .where(eq(memberships.tenantId, tenantId));
    const tenantAdminsList = await db
      .select({ userId: tenantAdmins.userId })
      .from(tenantAdmins)
      .where(and(eq(tenantAdmins.tenantId, tenantId), eq(tenantAdmins.status, 'active')));

    const activeAdminSet = new Set(tenantAdminsList.map((a) => a.userId));
    const candidateIds = new Set<string>();
    for (const m of tenantMemberships) candidateIds.add(m.userId);
    for (const a of tenantAdminsList) candidateIds.add(a.userId);

    // Filter out users already in this company
    const availableUserIds = Array.from(candidateIds).filter((id) => !existingMemberUserIds.has(id));
    if (availableUserIds.length === 0) {
      return [];
    }

    const conditions = [inArray(users.id, availableUserIds), eq(users.status, 'active')];
    if (search && search.trim()) {
      const s = `%${search.trim()}%`;
      conditions.push(or(like(users.email, s), like(users.firstName, s), like(users.lastName, s))!);
    }

    const availableUsers = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
      })
      .from(users)
      .where(and(...conditions))
      .orderBy(users.firstName, users.lastName)
      .limit(50);

    return availableUsers.map((u) => ({
      id: u.id,
      userId: u.id,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      fullName: `${u.firstName} ${u.lastName}`.trim(),
      name: `${u.firstName} ${u.lastName}`.trim(),
      tenantAuthority: activeAdminSet.has(u.id) ? 'tenant_admin' : 'standard',
      isTenantAdmin: activeAdminSet.has(u.id),
    }));
  }

  async findCompanyInvitationById(
    companyId: string,
    invitationId: string,
    db: DbExecutor = getDb(),
  ) {
    const [inv] = await db
      .select()
      .from(invitations)
      .where(and(eq(invitations.id, invitationId), eq(invitations.companyId, companyId)));
    return inv ?? null;
  }

  async resendCompanyInvitation(
    invitationId: string,
    newExpiresAt: Date,
    db: DbExecutor = getDb(),
  ) {
    await db
      .update(invitations)
      .set({
        expiresAt: newExpiresAt,
        status: 'pending',
        updatedAt: new Date(),
      })
      .where(eq(invitations.id, invitationId));

    const [updated] = await db.select().from(invitations).where(eq(invitations.id, invitationId));
    return updated ?? null;
  }

  async updateCompanyInvitationStatus(
    invitationId: string,
    status: 'pending' | 'accepted' | 'expired' | 'cancelled',
    db: DbExecutor = getDb(),
  ) {
    await db
      .update(invitations)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(eq(invitations.id, invitationId));

    const [updated] = await db.select().from(invitations).where(eq(invitations.id, invitationId));
    return updated ?? null;
  }
}

export const tenantAdminRepository = new TenantAdminRepository();
