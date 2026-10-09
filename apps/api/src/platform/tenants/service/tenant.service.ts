import { eq, and, desc, or } from 'drizzle-orm';
import { getDb } from '../../../db/connection.js';
import {
  companies,
  tenantAdmins,
  users,
  invitations,
  tenantSubscriptions,
  memberships,
  provisioningJobs,
} from '../../../db/schema.js';
import { tenantRepository, TenantRepository } from '../repository/tenant.repository.js';
import { auditService, AuditService } from '../../audit/service/audit.service.js';
import { NotFoundError, ConflictError, BadRequestError } from '../../../app/errors/AppError.js';
import { generateSurrogateId } from '../../auth/security.js';
import type {
  CompanyCapacitySummary,
  CreateTenantDto,
  TenantFilter,
  TenantRecord,
  UpdateTenantDto,
  TenantOverviewDto,
  TenantActivityFilter,
  TenantPrimaryAdminSummary,
} from '../types/tenant.types.js';

export class TenantService {
  constructor(
    private readonly repo: TenantRepository = tenantRepository,
    private readonly audit: AuditService = auditService,
  ) {}

  async listTenants(filter: TenantFilter): Promise<{ items: TenantRecord[]; total: number }> {
    return this.repo.list(filter);
  }

  async getTenantById(id: string): Promise<TenantRecord> {
    const tenant = await this.repo.findById(id);
    if (!tenant) {
      throw new NotFoundError(`Tenant '${id}' not found`);
    }
    return tenant;
  }

  async createTenant(
    dto: CreateTenantDto,
    actor?: { id?: string; email?: string },
  ): Promise<TenantRecord> {
    const existingCode = await this.repo.findByCode(dto.code);
    if (existingCode) {
      throw new ConflictError(`Tenant with code '${dto.code}' already exists`);
    }

    if (dto.id) {
      const existingId = await this.repo.findById(dto.id);
      if (existingId) {
        throw new ConflictError(`Tenant with ID '${dto.id}' already exists`);
      }
    }

    const created = await this.repo.create(dto);

    await this.audit.logEvent({
      actorUserId: actor?.id,
      actorEmail: actor?.email,
      action: 'tenant_created',
      targetType: 'tenant',
      targetId: created.id,
      tenantId: created.id,
      metadata: { name: created.name, code: created.code, status: created.status },
    });

    return created;
  }

  async updateTenant(
    id: string,
    dto: UpdateTenantDto,
    actor?: { id?: string; email?: string },
  ): Promise<TenantRecord> {
    await this.getTenantById(id);
    const updated = await this.repo.update(id, dto);

    await this.audit.logEvent({
      actorUserId: actor?.id,
      actorEmail: actor?.email,
      action: 'tenant_updated',
      targetType: 'tenant',
      targetId: id,
      tenantId: id,
      metadata: { changes: dto },
    });

    return updated;
  }

  async activateTenant(
    id: string,
    reason?: string,
    actor?: { id?: string; email?: string },
  ): Promise<TenantRecord> {
    const tenant = await this.getTenantById(id);
    const now = new Date();
    const updated = typeof this.repo.updateTenantStatus === 'function'
      ? await this.repo.updateTenantStatus(id, 'active', {
          suspendedReason: null,
          suspendedAt: null,
          reactivatedAt: now,
        })
      : await this.repo.updateStatus(id, 'active');

    const eventId = generateSurrogateId('tle');
    if (typeof this.repo.recordLifecycleEvent === 'function') {
      await this.repo.recordLifecycleEvent({
        id: eventId,
        tenantId: id,
        eventType: 'reactivated',
        previousStatus: tenant.status,
        newStatus: 'active',
        reason: reason || 'Tenant reactivated by administrator',
        actorUserId: actor?.id || null,
        actorEmail: actor?.email || null,
      });
    }

    await this.audit.logEvent({
      actorUserId: actor?.id,
      actorEmail: actor?.email,
      action: 'tenant_reactivated',
      targetType: 'tenant',
      targetId: id,
      tenantId: id,
      metadata: { previousStatus: tenant.status, newStatus: 'active', reason },
    });

    return updated;
  }

  async suspendTenant(
    id: string,
    reason: string = 'Administrative suspension',
    actor?: { id?: string; email?: string },
  ): Promise<TenantRecord> {
    const tenant = await this.getTenantById(id);
    if (tenant.status === 'suspended') {
      throw new BadRequestError('Tenant is already suspended');
    }

    const now = new Date();
    const updated = typeof this.repo.updateTenantStatus === 'function'
      ? await this.repo.updateTenantStatus(id, 'suspended', {
          suspendedReason: reason,
          suspendedAt: now,
        })
      : await this.repo.updateStatus(id, 'suspended');

    const eventId = generateSurrogateId('tle');
    if (typeof this.repo.recordLifecycleEvent === 'function') {
      await this.repo.recordLifecycleEvent({
        id: eventId,
        tenantId: id,
        eventType: 'suspended',
        previousStatus: tenant.status,
        newStatus: 'suspended',
        reason,
        actorUserId: actor?.id || null,
        actorEmail: actor?.email || null,
      });
    }

    await this.audit.logEvent({
      actorUserId: actor?.id,
      actorEmail: actor?.email,
      action: 'tenant_suspended',
      targetType: 'tenant',
      targetId: id,
      tenantId: id,
      metadata: { previousStatus: tenant.status, newStatus: 'suspended', reason },
    });

    return updated;
  }

  async terminateTenant(
    id: string,
    confirmTenantId: string,
    reason: string,
    actor?: { id?: string; email?: string },
  ): Promise<TenantRecord> {
    if (!confirmTenantId || confirmTenantId !== id) {
      throw new BadRequestError(
        'Confirmation tenant ID must exactly match the target tenant ID to terminate',
        'TERMINATION_CONFIRMATION_MISMATCH',
      );
    }

    if (!reason || reason.trim().length < 5) {
      throw new BadRequestError('A valid termination reason (min 5 chars) is required');
    }

    const tenant = await this.getTenantById(id);
    if (tenant.status === 'archived') {
      throw new BadRequestError('Tenant is already terminated/archived');
    }

    const updated = typeof this.repo.updateTenantStatus === 'function'
      ? await this.repo.updateTenantStatus(id, 'archived', {
          suspendedReason: `Terminated: ${reason}`,
        })
      : await this.repo.updateStatus(id, 'archived');

    const eventId = generateSurrogateId('tle');
    if (typeof this.repo.recordLifecycleEvent === 'function') {
      await this.repo.recordLifecycleEvent({
        id: eventId,
        tenantId: id,
        eventType: 'terminated',
        previousStatus: tenant.status,
        newStatus: 'archived',
        reason,
        actorUserId: actor?.id || null,
        actorEmail: actor?.email || null,
      });
    }

    await this.audit.logEvent({
      actorUserId: actor?.id,
      actorEmail: actor?.email,
      action: 'tenant_terminated',
      targetType: 'tenant',
      targetId: id,
      tenantId: id,
      metadata: { previousStatus: tenant.status, newStatus: 'archived', reason },
    });

    return updated;
  }

  async getLifecycleHistory(id: string) {
    await this.getTenantById(id);
    return this.repo.listLifecycleEvents(id);
  }

  async getSummaryMetrics() {
    const counts = await this.repo.getCounts();
    return {
      totalTenants: counts.total,
      activeTenants: counts.active,
      trialTenants: (counts as any).trial ?? 0,
      suspendedTenants: counts.suspended,
    };
  }

  async getTenantOverview(id: string): Promise<TenantOverviewDto> {
    const tenant = await this.getTenantById(id);
    const db = getDb();

    // 1. Primary Company & company capacity
    const compRows = await db
      .select({
        id: companies.id,
        name: companies.name,
        code: companies.code,
        status: companies.status,
        createdAt: companies.createdAt,
      })
      .from(companies)
      .where(eq(companies.tenantId, id));

    const primaryCompany = compRows[0]
      ? {
          id: compRows[0].id,
          name: compRows[0].name,
          code: compRows[0].code,
          status: compRows[0].status,
          createdAt: compRows[0].createdAt.toISOString(),
        }
      : null;

    const capacity = await this.repo.getCapacity(id);

    // 2. Primary Admin
    const [paRow] = await db
      .select({
        userId: tenantAdmins.userId,
        status: tenantAdmins.status,
        createdAt: tenantAdmins.createdAt,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
      })
      .from(tenantAdmins)
      .leftJoin(users, eq(tenantAdmins.userId, users.id))
      .where(and(eq(tenantAdmins.tenantId, id), eq(tenantAdmins.isPrimary, true)));

    let primaryAdmin: TenantPrimaryAdminSummary | null = null;
    let adminInvitedAt: string | null = null;
    let adminAcceptedAt: string | null = null;

    if (paRow) {
      const fullName = [paRow.firstName, paRow.lastName].filter(Boolean).join(' ');
      primaryAdmin = {
        id: paRow.userId,
        name: fullName || paRow.email?.split('@')[0] || 'Administrator',
        email: paRow.email || '',
        status: paRow.status,
        invitedAt: null,
        acceptedAt: paRow.createdAt?.toISOString() ?? null,
      };
      adminAcceptedAt = paRow.createdAt?.toISOString() ?? null;
    } else {
      // Check pending invitations
      const [invRow] = await db
        .select({
          id: invitations.id,
          email: invitations.email,
          status: invitations.status,
          createdAt: invitations.createdAt,
        })
        .from(invitations)
        .where(
          and(
            eq(invitations.tenantId, id),
            or(
              eq(invitations.authorityType, 'tenant_admin'),
              eq(invitations.isPrimaryAdmin, true),
            ),
            eq(invitations.status, 'pending'),
          ),
        );

      if (invRow) {
        primaryAdmin = {
          id: '',
          name: invRow.email.split('@')[0] || 'Administrator',
          email: invRow.email,
          status: 'pending',
          invitedAt: invRow.createdAt.toISOString(),
          acceptedAt: null,
        };
        adminInvitedAt = invRow.createdAt.toISOString();
      }
    }

    // 3. Subscriptions & Enabled Applications
    const subRows = await db
      .select({
        applicationCode: tenantSubscriptions.applicationCode,
        planId: tenantSubscriptions.planId,
        status: tenantSubscriptions.status,
        accessMode: tenantSubscriptions.accessMode,
        licensedSeats: tenantSubscriptions.licensedSeats,
        currentPeriodEndsAt: tenantSubscriptions.currentPeriodEndsAt,
      })
      .from(tenantSubscriptions)
      .where(eq(tenantSubscriptions.tenantId, id));

    const enabledApplications = subRows.map((s) => ({
      applicationCode: s.applicationCode,
      planId: s.planId,
      status: s.status,
      isTrial: s.accessMode === 'trial' || s.status === 'trial',
      seats: s.licensedSeats ?? 0,
      currentPeriodEnd: s.currentPeriodEndsAt ? s.currentPeriodEndsAt.toISOString() : null,
    }));

    const activeSubs = subRows.filter((s) => s.status === 'active' || s.status === 'trial');
    const licensedSeats = activeSubs.reduce((acc, s) => acc + (s.licensedSeats ?? 0), 0);
    const hasPaid = activeSubs.some((s) => s.accessMode !== 'trial' && s.status === 'active');
    const hasTrial = activeSubs.some((s) => s.accessMode === 'trial' || s.status === 'trial');

    let derivedClassification: 'active' | 'trial' | 'suspended' | 'pending_setup' | 'archived' = 'active';
    if (tenant.status === 'suspended') {
      derivedClassification = 'suspended';
    } else if (tenant.status === 'archived') {
      derivedClassification = 'archived';
    } else if (hasPaid) {
      derivedClassification = 'active';
    } else if (hasTrial) {
      derivedClassification = 'trial';
    } else if (subRows.length === 0) {
      derivedClassification = tenant.status === 'active' ? 'active' : 'pending_setup';
    }

    // 4. Active Users
    const activeMembers = await db
      .select({ id: memberships.id })
      .from(memberships)
      .where(and(eq(memberships.tenantId, id), eq(memberships.status, 'active')));
    const activeUsers = activeMembers.length;

    // 5. Provisioning Health
    const [latestJob] = await db
      .select()
      .from(provisioningJobs)
      .where(eq(provisioningJobs.tenantId, id))
      .orderBy(desc(provisioningJobs.createdAt))
      .limit(1);

    const provisioningHealth = latestJob
      ? {
          status: latestJob.status,
          jobType: latestJob.jobType,
          stepTimeline: (latestJob.stepState as Record<string, unknown>) || {},
          attemptCount: latestJob.attemptCount ?? 1,
          maxAttempts: latestJob.maxAttempts ?? 3,
          retryEligible: latestJob.retryEligible ?? false,
          errorMessage: latestJob.lastError ?? null,
          errorCategory: latestJob.errorCode ?? null,
          lastUpdated: latestJob.updatedAt.toISOString(),
        }
      : null;

    // 6. Setup Progress & Health
    const health = tenant.health!;
    const setupProgress = tenant.setupProgress!;

    return {
      tenant: {
        id: tenant.id,
        name: tenant.name,
        code: tenant.code,
        status: tenant.status,
        maxCompanies: tenant.maxCompanies,
        contactEmail: tenant.contactEmail,
        contactPhone: tenant.contactPhone,
        logoUrl: tenant.logoUrl,
        createdAt: tenant.createdAt,
        updatedAt: tenant.updatedAt,
      },
      primaryCompany,
      totalCompanies: compRows.length,
      companyCapacity: capacity,
      primaryAdmin,
      enabledApplications,
      activeUsers,
      licensedSeats,
      provisioningHealth,
      setupProgress,
      health,
      derivedCommercialClassification: derivedClassification,
      attentionRequired: {
        needed: health.status !== 'healthy',
        reason: health.reason,
        action: health.nextBestAction ?? null,
      },
      importantTimestamps: {
        createdAt: tenant.createdAt,
        updatedAt: tenant.updatedAt,
        primaryAdminInvitedAt: adminInvitedAt,
        primaryAdminAcceptedAt: adminAcceptedAt,
      },
    };
  }

  async getTenantActivity(id: string, filterOrLimit?: TenantActivityFilter | number) {
    await this.getTenantById(id);
    return this.repo.listAuditLogsByTenant(id, filterOrLimit);
  }

  async exportTenantActivityCsv(id: string, filter?: TenantActivityFilter): Promise<string> {
    await this.getTenantById(id);
    const filterParams = { ...(filter || {}), limit: 1000, page: 1 };
    const res = await this.repo.listAuditLogsByTenant(id, filterParams);
    const logs = Array.isArray(res) ? res : res.items;

    const headers = ['Timestamp', 'Action', 'Target Type', 'Target ID', 'Actor Email', 'Actor User ID', 'Details'];

    const sanitizeCell = (val: unknown): string => {
      if (val === null || val === undefined) return '""';
      let str = typeof val === 'object' ? JSON.stringify(val) : String(val);

      // Redact sensitive patterns if any
      str = str.replace(/"token":\s*"[^"]+"/g, '"token":"[REDACTED]"');

      // Formula injection defense: If string starts with =, +, -, @, prepend single quote
      if (/^[=+\-@]/.test(str)) {
        str = `'${str}`;
      }

      // Escape quotes
      return `"${str.replace(/"/g, '""')}"`;
    };

    const rows = logs.map((log: any) => [
      sanitizeCell(log.createdAt.toISOString()),
      sanitizeCell(log.action),
      sanitizeCell(log.targetType),
      sanitizeCell(log.targetId),
      sanitizeCell(log.actorEmail || ''),
      sanitizeCell(log.actorUserId || ''),
      sanitizeCell(log.metadata || ''),
    ]);

    return [headers.join(','), ...rows.map((r: string[]) => r.join(','))].join('\r\n');
  }

  async getCompanyCapacity(id: string): Promise<CompanyCapacitySummary> {
    const tenant = await this.getTenantById(id);
    return this.repo.getCapacity(tenant.id);
  }

  async updateCompanyCapacity(
    id: string,
    maxCompanies: number,
    actor?: { id?: string; email?: string },
  ): Promise<CompanyCapacitySummary> {
    const tenant = await this.getTenantById(id);

    if (!Number.isInteger(maxCompanies) || maxCompanies < 1) {
      throw new BadRequestError(
        'maxCompanies must be a positive integer',
        'INVALID_COMPANY_CAPACITY',
      );
    }

    const currentUsage = await this.repo.countCapacityConsumingCompanies(id);
    if (maxCompanies < currentUsage) {
      throw new ConflictError(
        `Cannot set company capacity to ${maxCompanies}. Tenant already has ${currentUsage} companies consuming capacity.`,
        'COMPANY_CAPACITY_BELOW_CURRENT_USAGE',
      );
    }

    const previousMax = tenant.maxCompanies;
    await this.repo.updateCapacity(id, maxCompanies);

    await this.audit.logEvent({
      actorUserId: actor?.id,
      actorEmail: actor?.email,
      action: 'tenant_company_capacity_updated',
      targetType: 'tenant',
      targetId: id,
      tenantId: id,
      companyId: null,
      metadata: {
        previousMaxCompanies: previousMax,
        newMaxCompanies: maxCompanies,
        currentUsage,
      },
    });

    return {
      used: currentUsage,
      max: maxCompanies,
      remaining: maxCompanies - currentUsage,
    };
  }
}

export const tenantService = new TenantService();
