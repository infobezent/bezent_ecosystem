import { and, eq, inArray, isNull, or, sql } from 'drizzle-orm';
import { getDb } from '../../../db/connection.js';
import {
  companies,
  employees,
  memberships,
  roleAssignments,
  rolePermissions,
  roles,
  tenants,
  users,
  type Company,
  type Role,
  type RoleAssignment,
  type Tenant,
} from '../../../db/schema.js';
import { generateSurrogateId } from '../../auth/security.js';

type Db = ReturnType<typeof getDb>;
export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];

/** A Drizzle database handle or an open transaction. */
export type DbExecutor = Db | Tx;

/** Employment statuses that keep a linked employee eligible for self-service. */
const ESS_INELIGIBLE_STATUSES = ['terminated', 'suspended'] as const;

/**
 * Data access for roles, role permissions and role assignments (ADR-017).
 * Every company-owned query is constrained by tenant_id and company_id.
 */
export class AccessRepository {
  transaction<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
    return getDb().transaction(fn);
  }

  async findCompanyWithTenant(
    companyId: string,
  ): Promise<{ company: Company; tenant: Tenant } | null> {
    const db = getDb();
    const [row] = await db
      .select({ company: companies, tenant: tenants })
      .from(companies)
      .innerJoin(tenants, eq(companies.tenantId, tenants.id))
      .where(eq(companies.id, companyId));
    return row ?? null;
  }

  /** Active roles held by the user in one company (inactive roles grant nothing). */
  async listActiveRolesForUser(
    userId: string,
    tenantId: string,
    companyId: string,
  ): Promise<Role[]> {
    const db = getDb();
    const rows = await db
      .select({ role: roles })
      .from(roleAssignments)
      .innerJoin(roles, eq(roleAssignments.roleId, roles.id))
      .where(
        and(
          eq(roleAssignments.userId, userId),
          eq(roleAssignments.tenantId, tenantId),
          eq(roleAssignments.companyId, companyId),
          eq(roleAssignments.status, 'active'),
          eq(roles.status, 'active'),
        ),
      );
    return rows.map((r) => r.role);
  }

  async listCustomRolePermissions(
    tenantId: string,
    companyId: string,
    roleIds: string[],
  ): Promise<Array<{ roleId: string; permissionId: string }>> {
    if (roleIds.length === 0) return [];
    const db = getDb();
    return db
      .select({ roleId: rolePermissions.roleId, permissionId: rolePermissions.permissionId })
      .from(rolePermissions)
      .where(
        and(
          eq(rolePermissions.tenantId, tenantId),
          eq(rolePermissions.companyId, companyId),
          inArray(rolePermissions.roleId, roleIds),
        ),
      );
  }

  /**
   * The employee record linked to this user in one company and still eligible
   * for self-service. An email match counts only for an UNLINKED record.
   */
  async findEssEligibleEmployee(
    userId: string,
    email: string,
    tenantId: string,
    companyId: string,
  ): Promise<{ id: string; employmentStatus: string } | null> {
    const db = getDb();
    const rows = await db
      .select({ id: employees.id, employmentStatus: employees.employmentStatus })
      .from(employees)
      .where(
        and(
          eq(employees.tenantId, tenantId),
          eq(employees.companyId, companyId),
          or(
            eq(employees.userId, userId),
            and(isNull(employees.userId), eq(sql`LOWER(${employees.email})`, email.toLowerCase())),
          ),
        ),
      );
    const eligible = rows.find(
      (r) => !(ESS_INELIGIBLE_STATUSES as readonly string[]).includes(r.employmentStatus),
    );
    return eligible ?? null;
  }

  /** System roles plus the company's custom roles. */
  async listRoles(tenantId: string, companyId: string): Promise<Role[]> {
    const db = getDb();
    return db
      .select()
      .from(roles)
      .where(
        or(
          and(eq(roles.isSystem, true), isNull(roles.companyId)),
          and(eq(roles.tenantId, tenantId), eq(roles.companyId, companyId)),
        ),
      );
  }

  /** A role usable in this company: a system role or the company's own custom role. */
  async findRoleForCompany(
    roleId: string,
    tenantId: string,
    companyId: string,
  ): Promise<Role | null> {
    const db = getDb();
    const [role] = await db
      .select()
      .from(roles)
      .where(
        and(
          eq(roles.id, roleId),
          or(
            and(eq(roles.isSystem, true), isNull(roles.companyId)),
            and(eq(roles.tenantId, tenantId), eq(roles.companyId, companyId)),
          ),
        ),
      );
    return role ?? null;
  }

  async findCustomRoleByCode(
    tenantId: string,
    companyId: string,
    code: string,
  ): Promise<Role | null> {
    const db = getDb();
    const [role] = await db
      .select()
      .from(roles)
      .where(
        and(eq(roles.tenantId, tenantId), eq(roles.companyId, companyId), eq(roles.code, code)),
      );
    return role ?? null;
  }

  async countActiveAssignmentsByRole(
    tenantId: string,
    companyId: string,
  ): Promise<Map<string, number>> {
    const db = getDb();
    const rows = await db
      .select({ roleId: roleAssignments.roleId, count: sql<number>`count(*)` })
      .from(roleAssignments)
      .where(
        and(
          eq(roleAssignments.tenantId, tenantId),
          eq(roleAssignments.companyId, companyId),
          eq(roleAssignments.status, 'active'),
        ),
      )
      .groupBy(roleAssignments.roleId);
    return new Map(rows.map((r) => [r.roleId, Number(r.count)]));
  }

  /** Active holders of a role in a company who also still hold an active membership. */
  async countActiveHolders(roleId: string, tenantId: string, companyId: string): Promise<number> {
    const db = getDb();
    const [row] = await db
      .select({ count: sql<number>`count(distinct ${roleAssignments.userId})` })
      .from(roleAssignments)
      .innerJoin(
        memberships,
        and(
          eq(memberships.userId, roleAssignments.userId),
          eq(memberships.companyId, roleAssignments.companyId),
          eq(memberships.status, 'active'),
        ),
      )
      .where(
        and(
          eq(roleAssignments.roleId, roleId),
          eq(roleAssignments.tenantId, tenantId),
          eq(roleAssignments.companyId, companyId),
          eq(roleAssignments.status, 'active'),
        ),
      );
    return Number(row?.count ?? 0);
  }

  async createCustomRole(
    tx: DbExecutor,
    role: {
      tenantId: string;
      companyId: string;
      code: string;
      name: string;
      description: string | null;
      moduleCode: Role['moduleCode'];
      actorId: string;
    },
    permissionIds: string[],
  ): Promise<string> {
    const id = generateSurrogateId('role');
    await tx.insert(roles).values({
      id,
      tenantId: role.tenantId,
      companyId: role.companyId,
      code: role.code,
      name: role.name,
      description: role.description,
      moduleCode: role.moduleCode,
      isSystem: false,
      status: 'active',
      createdBy: role.actorId,
      updatedBy: role.actorId,
    });
    await this.replaceRolePermissions(tx, id, role.tenantId, role.companyId, permissionIds);
    return id;
  }

  async updateCustomRole(
    tx: DbExecutor,
    roleId: string,
    tenantId: string,
    companyId: string,
    fields: { name?: string; description?: string | null; actorId: string },
  ): Promise<void> {
    await tx
      .update(roles)
      .set({
        ...(fields.name !== undefined ? { name: fields.name } : {}),
        ...(fields.description !== undefined ? { description: fields.description } : {}),
        updatedBy: fields.actorId,
      })
      .where(
        and(
          eq(roles.id, roleId),
          eq(roles.tenantId, tenantId),
          eq(roles.companyId, companyId),
          eq(roles.isSystem, false),
        ),
      );
  }

  async replaceRolePermissions(
    tx: DbExecutor,
    roleId: string,
    tenantId: string,
    companyId: string,
    permissionIds: string[],
  ): Promise<void> {
    await tx
      .delete(rolePermissions)
      .where(
        and(
          eq(rolePermissions.roleId, roleId),
          eq(rolePermissions.tenantId, tenantId),
          eq(rolePermissions.companyId, companyId),
        ),
      );
    if (permissionIds.length === 0) return;
    await tx.insert(rolePermissions).values(
      permissionIds.map((permissionId) => ({
        id: generateSurrogateId('rp'),
        tenantId,
        companyId,
        roleId,
        permissionId,
      })),
    );
  }

  async setCustomRoleStatus(
    roleId: string,
    tenantId: string,
    companyId: string,
    status: 'active' | 'inactive',
    actorId: string,
  ): Promise<void> {
    const db = getDb();
    await db
      .update(roles)
      .set({ status, updatedBy: actorId })
      .where(
        and(
          eq(roles.id, roleId),
          eq(roles.tenantId, tenantId),
          eq(roles.companyId, companyId),
          eq(roles.isSystem, false),
        ),
      );
  }

  async findAssignment(
    userId: string,
    roleId: string,
    tenantId: string,
    companyId: string,
    executor: DbExecutor = getDb(),
  ): Promise<RoleAssignment | null> {
    const [row] = await executor
      .select()
      .from(roleAssignments)
      .where(
        and(
          eq(roleAssignments.userId, userId),
          eq(roleAssignments.roleId, roleId),
          eq(roleAssignments.tenantId, tenantId),
          eq(roleAssignments.companyId, companyId),
        ),
      );
    return row ?? null;
  }

  /** Grants a role in one company, reactivating a previously revoked assignment. */
  async activateAssignment(
    tx: DbExecutor,
    input: {
      userId: string;
      roleId: string;
      tenantId: string;
      companyId: string;
      actorId: string | null;
    },
  ): Promise<void> {
    const existing = await this.findAssignment(
      input.userId,
      input.roleId,
      input.tenantId,
      input.companyId,
      tx,
    );
    if (existing) {
      if (existing.status !== 'active') {
        await tx
          .update(roleAssignments)
          .set({ status: 'active', assignedBy: input.actorId, revokedBy: null, revokedAt: null })
          .where(eq(roleAssignments.id, existing.id));
      }
      return;
    }
    await tx.insert(roleAssignments).values({
      id: generateSurrogateId('ra'),
      userId: input.userId,
      roleId: input.roleId,
      tenantId: input.tenantId,
      companyId: input.companyId,
      status: 'active',
      assignedBy: input.actorId,
    });
  }

  async revokeAssignment(
    tx: DbExecutor,
    input: {
      userId: string;
      roleId: string;
      tenantId: string;
      companyId: string;
      actorId: string | null;
    },
  ): Promise<void> {
    await tx
      .update(roleAssignments)
      .set({ status: 'revoked', revokedBy: input.actorId, revokedAt: new Date() })
      .where(
        and(
          eq(roleAssignments.userId, input.userId),
          eq(roleAssignments.roleId, input.roleId),
          eq(roleAssignments.tenantId, input.tenantId),
          eq(roleAssignments.companyId, input.companyId),
          eq(roleAssignments.status, 'active'),
        ),
      );
  }

  /** A company user with membership status (any active membership row counts as active). */
  async findCompanyUser(
    userId: string,
    tenantId: string,
    companyId: string,
  ): Promise<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    membershipStatus: 'active' | 'inactive' | 'revoked' | null;
  } | null> {
    const db = getDb();
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
      })
      .from(users)
      .where(eq(users.id, userId));
    if (!user) return null;

    const rows = await db
      .select({ status: memberships.status })
      .from(memberships)
      .where(
        and(
          eq(memberships.userId, userId),
          eq(memberships.tenantId, tenantId),
          eq(memberships.companyId, companyId),
        ),
      );
    if (rows.length === 0) return null;
    const membershipStatus = rows.some((r) => r.status === 'active')
      ? 'active'
      : rows.some((r) => r.status === 'inactive')
        ? 'inactive'
        : 'revoked';
    return { ...user, membershipStatus };
  }
}

export const accessRepository = new AccessRepository();
