import { eq, and, sql, desc, or, like } from 'drizzle-orm';
import { getDb } from '../../../db/connection.js';
import type { DbExecutor } from '../../access/repository/access.repository.js';
import {
  companies,
  tenants,
  users,
  memberships,
  invitations,
  tenantModules,
  auditLogs,
  employees,
  departments,
  designations,
  locations,
  onboardingCases,
  onboardingGeneralSettings,
  onboardingFieldConfigs,
  type Company,
  type NewMembership,
  type NewInvitation,
} from '../../../db/schema.js';
import type {
  AuthorizedCompanySummary,
  CompanyUserItem,
  UpdateCompanyProfileInput,
} from '../types/companyAdmin.types.js';
import {
  companyRepository,
  CompanyRepository,
} from '../../companies/repository/company.repository.js';
import {
  organizationRepository,
  OrganizationRepository,
} from '../../organization/repository/organization.repository.js';

export class CompanyAdminRepository {
  /** Every active company — platform Super Admin oversight only. */
  async listActiveCompaniesForOversight(): Promise<AuthorizedCompanySummary[]> {
    const db = getDb();
    const rows = await db
      .select({
        id: companies.id,
        name: companies.name,
        code: companies.code,
        status: companies.status,
        tenantId: companies.tenantId,
        tenantName: tenants.name,
      })
      .from(companies)
      .innerJoin(tenants, eq(companies.tenantId, tenants.id))
      .where(eq(companies.status, 'active'));

    return rows.map((r) => ({
      ...r,
      role: 'super_admin',
    }));
  }

  constructor(
    private readonly companyRepo: CompanyRepository = companyRepository,
    private readonly orgRepo: OrganizationRepository = organizationRepository,
  ) {}

  async getCompanyProfile(companyId: string): Promise<Company | null> {
    return this.companyRepo.getCompanyProfile(companyId);
  }

  async updateCompanyProfile(
    companyId: string,
    input: UpdateCompanyProfileInput,
  ): Promise<Company> {
    return this.companyRepo.updateCompanyProfile(companyId, input);
  }

  async listCompanyUsers(
    companyId: string,
    options: {
      search?: string;
      role?: string;
      status?: string;
      page?: number;
      limit?: number;
    } = {},
  ): Promise<{ items: CompanyUserItem[]; total: number }> {
    const db = getDb();
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 20));
    const offset = (page - 1) * limit;

    const conditions = [eq(memberships.companyId, companyId)];

    if (options.role) {
      conditions.push(
        eq(memberships.role, options.role as 'company_admin' | 'hr_manager' | 'employee' | 'user'),
      );
    }
    if (options.status) {
      conditions.push(eq(memberships.status, options.status as 'active' | 'inactive' | 'revoked'));
    }
    if (options.search) {
      const term = `%${options.search.trim().toLowerCase()}%`;
      conditions.push(
        or(like(users.email, term), like(users.firstName, term), like(users.lastName, term))!,
      );
    }

    const whereClause = and(...conditions);

    const [countRow] = await db
      .select({ count: sql<number>`count(*)` })
      .from(memberships)
      .innerJoin(users, eq(memberships.userId, users.id))
      .where(whereClause);

    const total = Number(countRow?.count || 0);

    const rows = await db
      .select({
        id: memberships.id,
        userId: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        phone: users.phone,
        role: memberships.role,
        membershipStatus: memberships.status,
        userStatus: users.status,
        lastLoginAt: users.lastLoginAt,
        joinedAt: memberships.createdAt,
      })
      .from(memberships)
      .innerJoin(users, eq(memberships.userId, users.id))
      .where(whereClause)
      .orderBy(desc(memberships.createdAt))
      .limit(limit)
      .offset(offset);

    return { items: rows, total };
  }

  /** The user's membership in the company, preferring an active row when several exist. */
  async findMembership(companyId: string, userId: string, db: DbExecutor = getDb()) {
    const [mem] = await db
      .select()
      .from(memberships)
      .where(and(eq(memberships.companyId, companyId), eq(memberships.userId, userId)))
      .orderBy(sql`${memberships.status} = 'active' DESC`, desc(memberships.updatedAt));
    return mem ?? null;
  }

  async findMembershipById(membershipId: string, db: DbExecutor = getDb()) {
    const [mem] = await db.select().from(memberships).where(eq(memberships.id, membershipId));
    return mem ?? null;
  }

  async createMembership(data: NewMembership, db: DbExecutor = getDb()) {
    await db.insert(memberships).values(data);
    const [mem] = await db.select().from(memberships).where(eq(memberships.id, data.id));
    return mem!;
  }

  async updateMembershipRole(
    membershipId: string,
    role: 'company_admin' | 'hr_manager' | 'employee' | 'user',
    db: DbExecutor = getDb(),
  ) {
    await db.update(memberships).set({ role }).where(eq(memberships.id, membershipId));
    return this.findMembershipById(membershipId, db);
  }

  /** Sets the status of every membership row the user has in the company; returns one of them. */
  async updateMembershipStatusForUser(
    companyId: string,
    userId: string,
    status: 'active' | 'inactive' | 'revoked',
    db: DbExecutor = getDb(),
  ) {
    await db
      .update(memberships)
      .set({ status })
      .where(and(eq(memberships.companyId, companyId), eq(memberships.userId, userId)));
    return this.findMembership(companyId, userId, db);
  }

  // Invitations
  async listInvitations(companyId: string) {
    const db = getDb();
    return db
      .select()
      .from(invitations)
      .where(eq(invitations.companyId, companyId))
      .orderBy(desc(invitations.createdAt));
  }

  async findInvitationById(id: string) {
    const db = getDb();
    const [inv] = await db.select().from(invitations).where(eq(invitations.id, id));
    return inv ?? null;
  }

  async findInvitationByEmail(companyId: string, email: string) {
    const db = getDb();
    const [inv] = await db
      .select()
      .from(invitations)
      .where(
        and(
          eq(invitations.companyId, companyId),
          eq(invitations.email, email.toLowerCase().trim()),
          eq(invitations.status, 'pending'),
        ),
      );
    return inv ?? null;
  }

  /** Finds all pending invitations for an email across all tenants. */
  async findActiveInvitationsByEmail(email: string) {
    const db = getDb();
    return db
      .select()
      .from(invitations)
      .where(
        and(eq(invitations.email, email.toLowerCase().trim()), eq(invitations.status, 'pending')),
      );
  }

  async createInvitation(data: NewInvitation) {
    const db = getDb();
    await db.insert(invitations).values(data);
    return this.findInvitationById(data.id);
  }

  async updateInvitationStatus(
    id: string,
    status: 'pending' | 'accepted' | 'expired' | 'cancelled',
    acceptedAt?: Date,
  ) {
    const db = getDb();
    await db
      .update(invitations)
      .set({
        status,
        acceptedAt: acceptedAt ?? null,
      })
      .where(eq(invitations.id, id));
    return this.findInvitationById(id);
  }

  async resendInvitation(id: string, newExpiresAt: Date) {
    const db = getDb();
    await db
      .update(invitations)
      .set({
        status: 'pending',
        expiresAt: newExpiresAt,
      })
      .where(eq(invitations.id, id));
    return this.findInvitationById(id);
  }

  // Dashboard Aggregates
  async getDashboardMetrics(tenantId: string, companyId: string) {
    const db = getDb();

    // Users & Roles
    const [userCount] = await db
      .select({
        total: sql<number>`count(*)`,
        active: sql<number>`sum(case when ${memberships.status} = 'active' then 1 else 0 end)`,
      })
      .from(memberships)
      .where(eq(memberships.companyId, companyId));

    // Role breakdown
    const roleRows = await db
      .select({
        role: memberships.role,
        count: sql<number>`count(*)`,
      })
      .from(memberships)
      .where(and(eq(memberships.companyId, companyId), eq(memberships.status, 'active')))
      .groupBy(memberships.role);

    const assignedRolesCount: Record<string, number> = {
      company_admin: 0,
      hr_manager: 0,
      employee: 0,
      user: 0,
    };
    for (const r of roleRows) {
      assignedRolesCount[r.role] = Number(r.count);
    }

    // Pending Invitations
    const [invCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(invitations)
      .where(and(eq(invitations.companyId, companyId), eq(invitations.status, 'pending')));

    // Active Employees
    const [empCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(employees)
      .where(and(eq(employees.companyId, companyId), eq(employees.employmentStatus, 'active')));

    // Pending Onboarding Cases
    const [caseCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(onboardingCases)
      .where(
        and(
          eq(onboardingCases.companyId, companyId),
          sql`${onboardingCases.status} != 'completed' AND ${onboardingCases.status} != 'archived'`,
        ),
      );

    return {
      totalUsers: Number(userCount?.total || 0),
      activeUsers: Number(userCount?.active || 0),
      pendingInvitations: Number(invCount?.count || 0),
      assignedRolesCount,
      activeEmployees: Number(empCount?.count || 0),
      pendingOnboardingCases: Number(caseCount?.count || 0),
    };
  }

  // Modules Status
  async getModulesStatus(tenantId: string, companyId: string) {
    const db = getDb();

    // Check tenant-level entitlements
    const tenantEntitlements = await db
      .select()
      .from(tenantModules)
      .where(and(eq(tenantModules.tenantId, tenantId), sql`${tenantModules.companyId} is null`));

    // Check company-level entitlements
    const companyEntitlements = await db
      .select()
      .from(tenantModules)
      .where(and(eq(tenantModules.tenantId, tenantId), eq(tenantModules.companyId, companyId)));

    return { tenantEntitlements, companyEntitlements };
  }

  // Company Audit Logs
  async listCompanyAuditLogs(
    companyId: string,
    options: { page?: number; limit?: number; action?: string } = {},
  ) {
    const db = getDb();
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 20));
    const offset = (page - 1) * limit;

    const conditions = [eq(auditLogs.companyId, companyId)];
    if (options.action) {
      conditions.push(eq(auditLogs.action, options.action));
    }

    const whereClause = and(...conditions);

    const [countRow] = await db
      .select({ count: sql<number>`count(*)` })
      .from(auditLogs)
      .where(whereClause);

    const total = Number(countRow?.count || 0);

    const rows = await db
      .select({
        id: auditLogs.id,
        actorUserId: auditLogs.actorUserId,
        actorEmail: auditLogs.actorEmail,
        action: auditLogs.action,
        targetType: auditLogs.targetType,
        targetId: auditLogs.targetId,
        metadata: auditLogs.metadata,
        createdAt: auditLogs.createdAt,
      })
      .from(auditLogs)
      .where(whereClause)
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit)
      .offset(offset);

    return { items: rows, total };
  }

  // Organization Masters Summary
  async getOrganizationSummary(companyId: string) {
    return this.orgRepo.getSummary(companyId);
  }

  // Policies Summary
  async getPoliciesSummary(companyId: string) {
    const db = getDb();

    const [generalSettings] = await db
      .select()
      .from(onboardingGeneralSettings)
      .where(eq(onboardingGeneralSettings.companyId, companyId));

    const fieldSettings = await db
      .select()
      .from(onboardingFieldConfigs)
      .where(eq(onboardingFieldConfigs.companyId, companyId));

    return {
      generalSettings: generalSettings ?? null,
      fieldSettingsCount: fieldSettings.length,
    };
  }
}

export const companyAdminRepository = new CompanyAdminRepository();
